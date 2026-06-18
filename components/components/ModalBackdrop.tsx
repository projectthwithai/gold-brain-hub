// @ts-nocheck
import { useEffect } from "react";

export default function ModalBackdrop({ onClose, children, TH, maxWidth = 480 }: any) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn, true);
    return () => document.removeEventListener("keydown", fn, true);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.84)",
      backdropFilter:"blur(6px)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:TH.surface, border:`1px solid ${TH.goldDark}`,
        borderRadius:4, padding:26, width:"100%", maxWidth,
        position:"relative", maxHeight:"90vh", overflowY:"auto",
        boxShadow:`0 0 60px ${TH.gold}18`,
      }}>
        {children}
      </div>
    </div>
  );
}