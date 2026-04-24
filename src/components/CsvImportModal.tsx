"use client";

import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ParsedRow {
  name: string;
  phone: string;
  address: string;
  note: string;
  website: string;
}

interface Props {
  onClose: () => void;
  onImported: (count: number) => void;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === sep && !inQuote) {
        result.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-zàâçéèêëîïôùûü]/gi, ""));
  const idx = (keys: string[]) => keys.reduce((found, k) => found !== -1 ? found : headers.indexOf(k), -1);

  const iName    = idx(["nom", "name", "entreprise", "société"]);
  const iPhone   = idx(["telephone", "tel", "phone", "téléphone"]);
  const iAddr    = idx(["adresse", "address"]);
  const iNote    = idx(["note", "commentaire", "comment"]);
  const iWebsite = idx(["site", "website", "web", "url"]);

  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    return {
      name:    iName    !== -1 ? cols[iName]    ?? "" : cols[0] ?? "",
      phone:   iPhone   !== -1 ? cols[iPhone]   ?? "" : cols[1] ?? "",
      address: iAddr    !== -1 ? cols[iAddr]    ?? "" : "",
      note:    iNote    !== -1 ? cols[iNote]    ?? "" : "",
      website: iWebsite !== -1 ? cols[iWebsite] ?? "" : "",
    };
  }).filter((r) => r.name && r.phone);
}

export default function CsvImportModal({ onClose, onImported }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setResult(null);
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) {
        setError("Aucune ligne valide trouvée. Vérifiez que le fichier contient les colonnes Nom et Téléphone.");
        setRows([]);
      } else {
        setRows(parsed);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non authentifié."); setImporting(false); return; }

    // Fetch existing phones to deduplicate
    const { data: existing } = await supabase
      .from("prospects")
      .select("phone")
      .eq("user_id", user.id)
      .range(0, 9999);
    const existingPhones = new Set((existing ?? []).map((p) => p.phone?.replace(/\s/g, "")));

    const toInsert = rows.filter((r) => !existingPhones.has(r.phone.replace(/\s/g, "")));
    const skipped = rows.length - toInsert.length;

    if (!toInsert.length) {
      setResult({ imported: 0, skipped });
      setImporting(false);
      return;
    }

    // Insert in batches of 50
    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50).map((r) => ({
        user_id: user.id,
        name: r.name,
        phone: r.phone,
        address: r.address || null,
        note: r.note || "",
        website: r.website || null,
        status: "À appeler",
      }));
      const { data: inserted, error: err } = await supabase.from("prospects").insert(batch).select("id");
      if (err) { setError(err.message); setImporting(false); return; }
      imported += inserted?.length ?? 0;
    }

    setResult({ imported, skipped });
    setImporting(false);
    if (imported > 0) onImported(imported);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[16px] w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#E5000A]" />
            <h2 className="text-white font-semibold">Importer des prospects (CSV)</h2>
          </div>
          <button onClick={onClose} className="text-[#555555] hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Instructions */}
          <div className="text-xs text-[#666666] space-y-1">
            <p>Colonnes reconnues automatiquement :</p>
            <p className="font-mono text-[#888888]">Nom · Téléphone · Adresse · Note · Site web</p>
            <p>Séparateurs acceptés : virgule ou point-virgule. Encodage UTF-8.</p>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-[#2a2a2a] hover:border-[#E5000A]/50 rounded-[12px] p-8 text-center cursor-pointer transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-[#aaaaaa]">
                <FileText className="w-5 h-5 text-[#E5000A]" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#333333] mx-auto mb-2" />
                <p className="text-sm text-[#555555]">Glissez un fichier CSV ou <span className="text-[#E5000A]">cliquez pour choisir</span></p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/25 rounded-[10px] text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-xs text-[#aaaaaa]">
                <span className="text-white font-semibold">{rows.length} prospect{rows.length !== 1 ? "s" : ""}</span> détecté{rows.length !== 1 ? "s" : ""}
              </p>
              <div className="overflow-x-auto rounded-[10px] border border-[#1a1a1a]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {["Nom", "Téléphone", "Adresse"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[#555555] font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-b border-[#0d0d0d] last:border-0">
                        <td className="px-3 py-2 text-white truncate max-w-[140px]">{r.name}</td>
                        <td className="px-3 py-2 text-[#aaaaaa]">{r.phone}</td>
                        <td className="px-3 py-2 text-[#666666] truncate max-w-[120px]">{r.address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <p className="text-center text-xs text-[#444444] py-2">+ {rows.length - 5} autres lignes</p>
                )}
              </div>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-start gap-2 p-3 bg-emerald-500/8 border border-emerald-500/25 rounded-[10px] text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{result.imported} prospect{result.imported !== 1 ? "s" : ""} importé{result.imported !== 1 ? "s" : ""}</p>
                {result.skipped > 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5">{result.skipped} ignoré{result.skipped !== 1 ? "s" : ""} (téléphone déjà dans le CRM)</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {result ? (
              <button
                onClick={onClose}
                className="flex-1 bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold py-2.5 rounded-[10px] transition-colors text-sm"
              >
                Fermer
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 bg-black border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#aaaaaa] hover:text-white py-2.5 rounded-[10px] transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={!rows.length || importing}
                  className="flex-1 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-[10px] transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {importing ? "Import en cours..." : `Importer ${rows.length} prospects`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
