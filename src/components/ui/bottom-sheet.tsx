/**
 * BottomSheet — Vista rápida que se desliza desde abajo.
 *
 * Wrapper semántico sobre el Drawer (vaul) con patrones pre-configurados
 * para el contexto de FieldCredit: detalle de expediente, acciones rápidas,
 * filtros, y confirmaciones.
 *
 * Uso:
 *   <BottomSheet
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     title="Detalle rápido"
 *     description="Expediente #2024-001"
 *   >
 *     <p>Contenido aquí...</p>
 *   </BottomSheet>
 *
 * Con trigger:
 *   <BottomSheet
 *     trigger={<Button variant="ghost">Ver detalle</Button>}
 *     title="Información del cliente"
 *   >
 *     <ClienteInfo />
 *   </BottomSheet>
 */

import { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  /** Controlar apertura externamente */
  open?: boolean;
  /** Callback de cambio de estado */
  onOpenChange?: (open: boolean) => void;
  /** Elemento que abre el sheet al tocarlo */
  trigger?: ReactNode;
  /** Título del sheet */
  title?: string;
  /** Descripción bajo el título */
  description?: string;
  /** Contenido principal */
  children: ReactNode;
  /** Contenido del footer (botones de acción) */
  footer?: ReactNode;
  /** Mostrar botón de cerrar */
  showClose?: boolean;
  /** Clase CSS del contenido */
  className?: string;
  /** Snap points para controlar altura (vaul feature) */
  snapPoints?: (string | number)[];
}

export function BottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  showClose = true,
  className,
  snapPoints,
}: BottomSheetProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
    >
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}

      <DrawerContent className={cn("max-h-[85vh]", className)}>
        {/* Header con título y botón de cerrar */}
        {(title || showClose) && (
          <DrawerHeader className="relative pb-2">
            {showClose && (
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full"
                  data-compact
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cerrar</span>
                </Button>
              </DrawerClose>
            )}
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}

        {/* Contenido scrollable */}
        <div className="overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>

        {/* Footer fijo */}
        {footer && (
          <DrawerFooter className="border-t border-border pb-safe">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
