"use client";

import { Command as CommandPrimitive } from "cmdk";
import { XIcon } from "lucide-react";
import { useState } from "react";

import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { parseRoles, TARGET_ROLES, withRole } from "@/data/target-roles";

const MAX_SUGGESTIONS = 8;

/** Multi-role tag input: type → suggestions → chips. Value is comma-joined. */
export function RoleTagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const roles = parseRoles(value);

  const add = (role: string) => {
    onChange(withRole(roles, role).join(", "));
    setQuery("");
  };

  const remove = (role: string) =>
    onChange(roles.filter((r) => r !== role).join(", "));

  const trimmed = query.trim();
  const q = trimmed.toLowerCase();
  const taken = (role: string) =>
    roles.some((existing) => existing.toLowerCase() === role.toLowerCase());

  // ponytail: plain filter over ~200 strings per keystroke, no memo needed.
  const suggestions = q
    ? TARGET_ROLES.filter(
        (r) => r.toLowerCase().includes(q) && !taken(r)
      ).slice(0, MAX_SUGGESTIONS)
    : [];

  const canAddCustom =
    trimmed.length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === q) &&
    !taken(trimmed);

  return (
    // shouldFilter={false} — we filter above so we can cap the list and append "add your own".
    <Command
      shouldFilter={false}
      className="h-auto overflow-visible bg-transparent"
    >
      <div className="flex flex-wrap items-center gap-1.5 border border-border bg-background px-2.5 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
        {roles.map((role) => (
          <span
            key={role}
            className="flex items-center gap-1 bg-muted px-2 py-1 text-[13px] text-foreground"
          >
            {role}
            <button
              type="button"
              onClick={() => remove(role)}
              aria-label={`Remove ${role}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <CommandPrimitive.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={roles.length === 0 ? placeholder : "Add another…"}
          className="flex-1 bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === "Backspace" && query === "" && roles.length > 0) {
              remove(roles[roles.length - 1]);
            }
          }}
        />
      </div>

      {trimmed.length > 0 && (
        <CommandList className="mt-1.5 border border-border bg-popover">
          {suggestions.map((role) => (
            <CommandItem key={role} value={role} onSelect={() => add(role)}>
              {role}
            </CommandItem>
          ))}
          {canAddCustom && (
            <CommandItem value={`add:${trimmed}`} onSelect={() => add(trimmed)}>
              Add &ldquo;{trimmed}&rdquo;
            </CommandItem>
          )}
        </CommandList>
      )}
    </Command>
  );
}
