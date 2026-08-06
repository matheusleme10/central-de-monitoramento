"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type RoleKey } from "@/lib/constants/roles";

interface UserMenuProps {
  name: string;
  email: string;
  image: string | null;
  role: string;
}

export function UserMenu({ name, email, image, role }: UserMenuProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left text-sm leading-tight sm:block">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role as RoleKey]}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">Alterar senha</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/*
          signOut client-side (next-auth/react), não server action + form.
          Dentro de um DropdownMenu (Radix), um <button type="submit"> num
          <form action={...}> some antes do submit disparar de verdade,
          porque o menu fecha/desmonta no mesmo clique — o botão "Sair"
          nunca chegava a deslogar. onSelect roda antes do fechamento.
        */}
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/login" })}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
