import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-fieldcredit-green group-[.toast]:text-white group-[.toast]:rounded-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          success: "group-[.toaster]:border-fieldcredit-green/30 group-[.toaster]:bg-fieldcredit-green-pale group-[.toaster]:text-fieldcredit-green-dark dark:group-[.toaster]:bg-green-900/40 dark:group-[.toaster]:text-green-200",
          error: "group-[.toaster]:border-fieldcredit-red/30 group-[.toaster]:bg-fieldcredit-red-light group-[.toaster]:text-fieldcredit-red dark:group-[.toaster]:bg-red-900/40 dark:group-[.toaster]:text-red-200",
        },
      }}
      offset={16}
      gap={8}
      duration={4000}
      {...props}
    />
  );
};

export { Toaster };
