import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { card, pageTitle } from "@/lib/ui";
import { StatusBadge, VerifiedBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { VerificationForm } from "./verification-form";
import { QuickVerificationForm } from "./quick-verification-form";

export const metadata = { title: "Verificación de identidad" };

export default async function VerificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireUser(["WORKER", "CLIENT"]);
  const { tipo } = await searchParams;
  const verification = await db.verification.findUnique({
    where: { userId: user.id },
  });

  // Rápida: solo si no hay una en curso/aprobada y el equipo no exigió la completa.
  const canSubmitQuick =
    (!verification || verification.status === "REJECTED") &&
    !user.fullVerificationRequired;
  // Completa: siempre que no haya ya una completa en curso/aprobada.
  const canSubmitFull = !(
    verification &&
    verification.level === "FULL" &&
    verification.status !== "REJECTED"
  );

  const showFullForm =
    canSubmitFull && (user.fullVerificationRequired || tipo === "completa");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={pageTitle}>Verificación de identidad</h1>
        <p className="mt-1 text-sm text-zinc-400">
          La verificación protege a toda la comunidad: confirma que eres una
          persona real y mayor de edad. Lo que envíes solo lo ve el equipo de
          revisión, nunca otros usuarios.
        </p>
      </div>

      {user.fullVerificationRequired && (
        <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
          <p className="text-sm text-amber-200">
            <span className="font-semibold">El equipo requiere tu verificación completa.</span>{" "}
            Por seguridad de la comunidad, tu cuenta debe verificarse con
            documento de identidad y selfie. Hasta entonces, mantén tu
            información al día.
          </p>
        </div>
      )}

      {verification && (
        <div className={card}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Estado actual</h2>
            {verification.status === "APPROVED" ? (
              <VerifiedBadge />
            ) : (
              <StatusBadge status={verification.status} />
            )}
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Nivel</dt>
              <dd className="text-zinc-200">
                {verification.level === "QUICK"
                  ? "Rápida (foto con cartel)"
                  : "Completa (documento + selfie)"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Enviada</dt>
              <dd className="text-zinc-200">{formatDateTime(verification.submittedAt)}</dd>
            </div>
            {verification.reviewedAt && (
              <div>
                <dt className="text-zinc-500">Revisada</dt>
                <dd className="text-zinc-200">{formatDateTime(verification.reviewedAt)}</dd>
              </div>
            )}
            {verification.isPremiumRequested && (
              <div>
                <dt className="text-zinc-500">Tipo</dt>
                <dd className="text-amber-300">Verificación premium solicitada</dd>
              </div>
            )}
          </dl>
          {verification.status === "REJECTED" && verification.notes && (
            <p className="mt-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              Motivo del rechazo: {verification.notes}
            </p>
          )}
          {verification.status === "PENDING" && (
            <p className="mt-3 text-sm text-zinc-400">
              Nuestro equipo está revisando tu envío. Normalmente toma menos de
              24 horas; te avisaremos con una notificación.
            </p>
          )}
        </div>
      )}

      {showFullForm ? (
        <div className={card}>
          <h2 className="mb-1 font-semibold text-white">Verificación completa</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Documento de identidad + selfie sosteniéndolo. Es el nivel máximo
            de confianza de la plataforma.
          </p>
          <VerificationForm />
          {canSubmitQuick && (
            <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
              ¿Prefieres empezar sin documento?{" "}
              <Link href="/verificacion" className="font-medium text-fuchsia-400 hover:text-fuchsia-300">
                Usa la verificación rápida
              </Link>
            </p>
          )}
        </div>
      ) : canSubmitQuick ? (
        <div className={card}>
          <h2 className="mb-1 font-semibold text-white">Verificación rápida</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Sin documentos: solo una foto tuya sosteniendo un papel escrito a
            mano. Es la vía estándar para activar tu cuenta.
          </p>
          <QuickVerificationForm />
          <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
            ¿Quieres el nivel máximo de confianza desde ya?{" "}
            <Link
              href="/verificacion?tipo=completa"
              className="font-medium text-fuchsia-400 hover:text-fuchsia-300"
            >
              Envía la verificación completa (documento + selfie)
            </Link>
          </p>
        </div>
      ) : (
        canSubmitFull &&
        verification?.status === "APPROVED" && (
          <div className={card}>
            <p className="text-sm text-zinc-400">
              Tu verificación rápida está aprobada. Si quieres el nivel máximo
              de confianza,{" "}
              <Link
                href="/verificacion?tipo=completa"
                className="font-medium text-fuchsia-400 hover:text-fuchsia-300"
              >
                envía la verificación completa →
              </Link>
            </p>
          </div>
        )
      )}
    </div>
  );
}
