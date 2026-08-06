"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FolderKanban, Loader2, Search, Sheet as SheetIcon, User, X } from "lucide-react";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface SearchResults {
  projects: Array<{ id: string; name: string; description: string | null; tags: string[] }>;
  spreadsheets: Array<{
    id: string;
    name: string;
    friendlyName: string | null;
    projectId: string;
    project: { name: string };
  }>;
  sheets: Array<{
    id: string;
    name: string;
    friendlyName: string | null;
    description: string | null;
    spreadsheetId: string;
    spreadsheet: { id: string; projectId: string; project: { name: string } };
  }>;
  members: Array<{
    userId: string;
    projectId: string;
    user: { name: string; email: string };
    project: { name: string };
  }>;
  errors: Array<{
    id: string;
    message: string | null;
    errorCode: string | null;
    sheetId: string;
    sheet: {
      name: string;
      friendlyName: string | null;
      spreadsheetId: string;
      spreadsheet: { id: string; projectId: string };
    };
  }>;
}

const EMPTY_RESULTS: SearchResults = {
  projects: [],
  spreadsheets: [],
  sheets: [],
  members: [],
  errors: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(value)}`);
      if (response.ok) {
        const body = await response.json();
        setResults(body.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timeout);
  }, [query, runSearch]);

  function go(path: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(path);
  }

  function clear() {
    setQuery("");
    setResults(EMPTY_RESULTS);
    inputRef.current?.focus();
  }

  const hasResults =
    results.projects.length +
      results.spreadsheets.length +
      results.sheets.length +
      results.members.length +
      results.errors.length >
    0;

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div
          className={cn(
            "flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 transition-colors",
            showPanel && "rounded-b-none border-b-transparent",
          )}
          cmdk-input-wrapper=""
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            onFocus={() => setOpen(true)}
            placeholder="Pesquisar projeto, planilha, aba, responsável, erro, tag..."
            className="h-9 border-0 px-0 py-0 focus:ring-0"
          />
          {isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={clear}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Limpar pesquisa"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!query && (
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
              Ctrl K
            </kbd>
          )}
        </div>

        {showPanel && (
          <div className="absolute left-0 right-0 top-full z-20 max-h-[70vh] overflow-hidden rounded-b-md border border-t-0 border-input bg-popover shadow-lg">
            <CommandList className="max-h-[70vh]">
              {!isLoading && !hasResults && (
                <CommandEmpty>Nenhum resultado para &ldquo;{query}&rdquo;</CommandEmpty>
              )}

              {results.projects.length > 0 && (
                <CommandGroup heading="Projetos">
                  {results.projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`project-${project.id}`}
                      onSelect={() => go(`/projetos/${project.id}`)}
                    >
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{project.name}</p>
                        {project.tags.length > 0 && (
                          <p className="truncate text-xs text-muted-foreground">{project.tags.join(", ")}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.spreadsheets.length > 0 && (
                <CommandGroup heading="Planilhas">
                  {results.spreadsheets.map((sheet) => (
                    <CommandItem
                      key={sheet.id}
                      value={`spreadsheet-${sheet.id}`}
                      onSelect={() => go(`/projetos/${sheet.projectId}/planilhas/${sheet.id}`)}
                    >
                      <SheetIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{sheet.friendlyName || sheet.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{sheet.project.name}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.sheets.length > 0 && (
                <CommandGroup heading="Abas">
                  {results.sheets.map((sheet) => (
                    <CommandItem
                      key={sheet.id}
                      value={`aba-${sheet.id}`}
                      onSelect={() =>
                        go(
                          `/projetos/${sheet.spreadsheet.projectId}/planilhas/${sheet.spreadsheet.id}/abas/${sheet.id}`,
                        )
                      }
                    >
                      <SheetIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{sheet.friendlyName || sheet.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {sheet.description || sheet.spreadsheet.project.name}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.members.length > 0 && (
                <CommandGroup heading="Responsáveis">
                  {results.members.map((member) => (
                    <CommandItem
                      key={`${member.projectId}-${member.userId}`}
                      value={`member-${member.projectId}-${member.userId}`}
                      onSelect={() => go(`/projetos/${member.projectId}`)}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{member.user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email} · {member.project.name}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.errors.length > 0 && (
                <CommandGroup heading="Erros">
                  {results.errors.map((event) => (
                    <CommandItem
                      key={event.id}
                      value={`error-${event.id}`}
                      onSelect={() =>
                        go(
                          `/projetos/${event.sheet.spreadsheet.projectId}/planilhas/${event.sheet.spreadsheet.id}/abas/${event.sheetId}`,
                        )
                      }
                    >
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <div className="min-w-0">
                        <p className="truncate">
                          {event.errorCode ? `[${event.errorCode}] ` : ""}
                          {event.message}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.sheet.friendlyName || event.sheet.name}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
