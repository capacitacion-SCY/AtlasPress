"use client";

import { useState } from "react";

type BackupFileInputProps = {
  disabled?: boolean;
};

export function BackupFileInput({ disabled = false }: BackupFileInputProps) {
  const [fileName, setFileName] = useState("");

  return (
    <label className="backup-upload-card">
      <span className="backup-upload-card__title">Seleccionar archivo de backup</span>
      <span className="backup-upload-card__copy">Formato permitido: .json</span>
      <span className="backup-upload-card__file">{fileName || "Ningun archivo seleccionado"}</span>
      <input
        type="file"
        name="backup_file"
        accept="application/json,.json"
        disabled={disabled}
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
      />
    </label>
  );
}
