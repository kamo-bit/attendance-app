"use client";
import { Coffee, Plus, Trash2 } from "lucide-react";
import type { AttendanceInput } from "@/lib/attendance";
import { TimeInput } from "@/components/time-input";

export function AttendanceFields({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  prefix = "attendance",
}: {
  value: AttendanceInput;
  onChange: (value: AttendanceInput) => void;
  disabled?: boolean;
  readOnly?: boolean;
  prefix?: string;
}) {
  const change = (patch: Partial<AttendanceInput>) =>
    onChange({ ...value, ...patch });
  function removeBreak(index: number) {
    if (value.breakCount === 2)
      change(
        index === 0
          ? {
              break1From: value.break2From,
              break1To: value.break2To,
              break2From: "",
              break2To: "",
              breakCount: 1,
            }
          : { break2From: "", break2To: "", breakCount: 1 },
      );
    else
      change({ hasBreak: false, breakCount: 0, break1From: "", break1To: "" });
  }
  return (
    <fieldset
      disabled={disabled}
      className="stack"
      style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
    >
      <legend className="sr-only">Tanggal dan jam kerja</legend>
      <div className="field">
        <label htmlFor={`${prefix}-date`}>Tanggal kerja</label>
        <input
          className="form-input"
          id={`${prefix}-date`}
          type="date"
          value={value.attendanceDate}
          onChange={(event) => change({ attendanceDate: event.target.value })}
          required
          aria-describedby={`${prefix}-date-help`}
        />
        <p className="field-help" id={`${prefix}-date-help`}>
          Bisa mencatat tanggal sebelumnya.
        </p>
      </div>
      <div className="two-col">
        <div className="field">
          <label className="time-label" htmlFor={`${prefix}-in`}>
            <i className="teal-dot" aria-hidden="true" />
            Jam masuk
          </label>
          <TimeInput
            id={`${prefix}-in`}
            label="Jam masuk"
            disabled={disabled}
            value={value.clockIn}
            readOnly={readOnly}
            onChange={(clockIn) => change({ clockIn })}
            large
          />
        </div>
        <div className="field">
          <label className="time-label" htmlFor={`${prefix}-out`}>
            <i className="coral-dot" aria-hidden="true" />
            Jam pulang
          </label>
          <TimeInput
            id={`${prefix}-out`}
            label="Jam pulang"
            disabled={disabled}
            value={value.clockOut}
            readOnly={readOnly}
            onChange={(clockOut) => change({ clockOut })}
            large
          />
        </div>
      </div>
      <p className="field-help">
        Format 24 jam. Ketuk ikon jam untuk memilih waktu, atau ketik 0900 di
        komputer. Jam pulang boleh dikosongkan untuk draf.
      </p>
      <section className="section-divider">
        <div className="break-heading">
          <div>
            <h3 id={`${prefix}-break-label`}>
              <Coffee aria-hidden="true" />
              Istirahat
            </h3>
            <p className="field-help">
              Waktu istirahat tidak dihitung sebagai jam kerja.
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            className="toggle"
            role="switch"
            aria-checked={value.hasBreak}
            aria-labelledby={`${prefix}-break-label`}
            onClick={() =>
              change({
                hasBreak: !value.hasBreak,
                breakCount: value.hasBreak ? 0 : 1,
              })
            }
          >
            <span className="toggle-track" />
          </button>
        </div>
        {value.hasBreak && (
          <>
            {Array.from({ length: value.breakCount || 1 }, (_, index) => {
              const start = index === 0 ? "break1From" : "break2From";
              const end = index === 0 ? "break1To" : "break2To";
              return (
                <div className="break-row" key={index}>
                  <div className="field-label-row">
                    <strong className="field-label">
                      Istirahat {index + 1}
                    </strong>
                    <button
                      type="button"
                      disabled={readOnly}
                      className="text-button text-coral"
                      onClick={() => removeBreak(index)}
                      aria-label={`Hapus istirahat ${index + 1}`}
                    >
                      <Trash2 aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                  <div className="two-col">
                    <div className="field">
                      <label htmlFor={`${prefix}-${start}`}>Mulai</label>
                      <TimeInput
                        id={`${prefix}-${start}`}
                        label={`Mulai istirahat ${index + 1}`}
                        disabled={disabled}
                        value={value[start]}
                        readOnly={readOnly}
                        onChange={(time) => change({ [start]: time })}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${prefix}-${end}`}>Selesai</label>
                      <TimeInput
                        id={`${prefix}-${end}`}
                        label={`Selesai istirahat ${index + 1}`}
                        disabled={disabled}
                        value={value[end]}
                        readOnly={readOnly}
                        onChange={(time) => change({ [end]: time })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {value.breakCount < 2 && (
              <button
                type="button"
                disabled={readOnly}
                className="text-button"
                onClick={() => change({ breakCount: 2 })}
              >
                <Plus aria-hidden="true" />
                Tambah istirahat kedua
              </button>
            )}
          </>
        )}
      </section>
    </fieldset>
  );
}
