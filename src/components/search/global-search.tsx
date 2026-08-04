"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FolderKanban, Search, Sheet as SheetIcon, User } from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
    router.push(path);
  }

  const hasResults =
    results.projects.length +
      results.spreadsheets.length +
      results.sheets.length +
      results.members.length +
      results.errors.length >
    0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Pesquisar
        <kbd className="ml-4 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar projeto, planilha, aba, responsável, erro, tag..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!isLoading && !hasResults && (
            <CommandEmpty>
              {query.trim().length < 2 ? "Digite ao menos 2 caracteres" : "Nenhum resultado"}
            </CommandEmpty>
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
                  <div>
                    <p>{project.name}</p>
                    {project.tags.length > 0 && (
                      <p className="text-xs text-muted-foreground">{project.tags.join(", ")}</p>
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
                  <div>
                    <p>{sheet.friendlyName || sheet.name}</p>
                    <p className="text-xs text-muted-foreground">{sheet.project.name}</p>
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
                  <div>
                    <p>{sheet.friendlyName || sheet.name}</p>
                    <p className="text-xs text-muted-foreground">{sheet.spreadsheet.project.name}</p>
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
                  <div>
                    <p>{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">
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
                  <div>
                    <p className="line-clamp-1">
                      {event.errorCode ? `[${event.errorCode}] ` : ""}
                      {event.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.sheet.friendlyName || event.sheet.name}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
