"use client";

import { useState } from "react";
import { Avatar } from "./avatar";
import { PhotoLightbox } from "./photo-lightbox";

/**
 * Avatar de perfil que abre un visor a pantalla completa al cliquearlo (con
 * botón de contacto por WhatsApp si se pasa `phone`). Sin foto, se comporta
 * como el Avatar normal (iniciales, no clicable).
 */
export function ProfileAvatarButton({
  photoPath,
  name,
  phone,
  className,
}: {
  photoPath?: string | null;
  name: string;
  phone?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!photoPath) {
    return <Avatar photoPath={photoPath} name={name} className={className} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ver foto"
        className="cursor-pointer rounded-full"
      >
        <Avatar photoPath={photoPath} name={name} className={className} />
      </button>
      {open && (
        <PhotoLightbox
          src={`/api/files/${photoPath}`}
          alt={name}
          phone={phone}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
