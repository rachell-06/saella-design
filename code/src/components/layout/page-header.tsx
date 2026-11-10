import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Top of every product screen: optional breadcrumb, title (24px weight 500, foundations §2),
// one line of context, and the screen's main actions on the right.
export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  title: string;
  description?: string;
  /** Parent pages; the current page is added from `title`. */
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  /** Extra line under the title, e.g. a StatusBadge. */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb) => (
              <Fragment key={crumb.label}>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    crumb.label
                  )}
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </Fragment>
            ))}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-3xl font-normal tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
