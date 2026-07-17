import { useId, useMemo } from "react";
import { Upload, X } from "lucide-react";
import clsx from "clsx";

function FileUpload({
  label,
  accept,
  hint,
  error,
  file,
  onChange,
  previewUrl,
}) {
  const inputId = useId();

  const localPreview = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (file && file.type?.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file, previewUrl]);

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className={clsx(
          "rounded-xl border border-dashed bg-slate-50 p-4 transition",
          error ? "border-red-400" : "border-slate-300 hover:border-indigo-400"
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            {localPreview ? (
              <img
                src={localPreview}
                alt="Upload preview"
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700">
                FILE
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {file.name}
              </p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>

            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 py-3 text-center"
          >
            <Upload className="text-indigo-600" size={22} />
            <span className="text-sm font-medium text-slate-700">
              Click to upload
            </span>
            {hint && <span className="text-xs text-slate-500">{hint}</span>}
          </label>
        )}

        <input
          id={inputId}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FileUpload;
