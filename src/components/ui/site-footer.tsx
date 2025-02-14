
import { Separator } from "./separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col gap-4 py-8 px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0">
          <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with ❤️ by your team © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4 text-sm">
              <a href="/docs" className="text-muted-foreground hover:text-foreground">
                Documentation
              </a>
              <Separator orientation="vertical" className="h-4" />
              <a href="/admin" className="text-muted-foreground hover:text-foreground">
                Admin
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
