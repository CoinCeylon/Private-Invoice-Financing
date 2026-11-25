import { UploadCloud } from 'lucide-react'
import { useId } from 'react'
import { Field } from './ledger'

export function DocumentInput({ label, file, onFile, error }: {
  label: string
  file: File | undefined
  onFile: (file: File | undefined) => void
  error?: string
}) {
  const id = useId()

  return (
    <Field name={id} label={label} hint="PDF, PNG, JPEG or WebP, up to 15 MB." error={error}>
      <div className="file-control">
        <UploadCloud aria-hidden="true" />
        <input
          id={id}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => onFile(event.currentTarget.files?.[0])}
        />
        {file && <p>{file.name}</p>}
      </div>
    </Field>
  )
}
