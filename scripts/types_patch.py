"""Ajuste manual de src/types/database.ts enquanto não dá para gerar os tipos do banco.
Uso (como módulo):
  add_columns("workspaces", {"modo_trabalho": ("string", False)})   # (tipo, opcional_no_insert?)
  add_table("client_assignees", {"workspace_id": ("string", False), ...})
  add_function("set_member_clients", "{ p_workspace_id: string }", "undefined")
Rode `pnpm db:types:remote` (ou o gerador do MCP) para substituir tudo pelos tipos reais.
"""
import re

P = "src/types/database.ts"


def _read():
    return open(P).read()


def _write(s):
    open(P, "w").write(s)


def _block(s, name, start_at=0):
    i = s.index(f"\n      {name}: {{\n", start_at)
    return i


def add_columns(table, cols):
    s = _read()
    i = _block(s, table)
    for part, optional_all in (("Row", None), ("Insert", "insert"), ("Update", True)):
        j = s.index(f"        {part}: {{\n", i) + len(f"        {part}: {{\n")
        end = s.index("        };\n", j)
        body = s[j:end]
        for c, (t, has_default) in cols.items():
            if re.search(rf"^          {c}\??:", body, re.M):
                continue
            if part == "Row":
                line = f"          {c}: {t};\n"
            elif part == "Insert":
                line = f"          {c}{'?' if has_default or 'null' in t else ''}: {t};\n"
            else:
                line = f"          {c}?: {t};\n"
            body += line
        lines = sorted([l for l in body.splitlines(True) if l.strip()], key=lambda l: l.strip().split(":")[0].rstrip("?"))
        s = s[:j] + "".join(lines) + s[end:]
    _write(s)


def add_table(table, cols):
    s = _read()
    if f"\n      {table}: {{\n" in s[: s.index("    Views: {", s.index("Tables: {", s.index("public: {")))]:
        return add_columns(table, cols)
    names = sorted(cols)
    row = "".join(f"          {c}: {cols[c][0]};\n" for c in names)
    ins = "".join(f"          {c}{'?' if cols[c][1] or 'null' in cols[c][0] else ''}: {cols[c][0]};\n" for c in names)
    upd = "".join(f"          {c}?: {cols[c][0]};\n" for c in names)
    block = (f"      {table}: {{\n        Row: {{\n{row}        }};\n        ComputedFields: never;\n"
             f"        Insert: {{\n{ins}        }};\n        Update: {{\n{upd}        }};\n        Relationships: [];\n      }};\n")
    pub = s.index("  public: {")
    tables = s.index("    Tables: {\n", pub) + len("    Tables: {\n")
    _write(s[:tables] + block + s[tables:])


def add_function(name, args, returns):
    s = _read()
    pub = s.index("  public: {")
    fn = s.index("    Functions: {\n", pub) + len("    Functions: {\n")
    if f"\n      {name}: {{\n" in s[fn: s.index("    Enums: {", fn)]:
        a = s.index(f"\n      {name}: {{\n", fn) + 1
        b = s.index("\n      };\n", a) + len("\n      };\n")
        s = s[:a] + s[b:]
    block = f"      {name}: {{\n        Args: {args};\n        Returns: {returns};\n      }};\n"
    _write(s[:fn] + block + s[fn:])


def add_enum_values(enum, values):
    s = _read()
    pub = s.index("  public: {")
    en = s.index("    Enums: {\n", pub)
    m = re.compile(rf"(      {enum}:)((?:\n?\s*\| \"[^\"]+\")+|\s*\"[^\"]+\"(?:\s*\| \"[^\"]+\")*);").search(s, en)
    existing = re.findall(r'"([^"]+)"', m.group(2))
    allv = existing + [v for v in values if v not in existing]
    s = s[: m.start()] + f"      {enum}: " + " | ".join(f'"{v}"' for v in allv) + ";" + s[m.end():]
    # constantes
    c = s.find(f"      {enum}: [", s.index("Constants"))
    if c != -1:
        e = s.index("]", c)
        s = s[:c] + f"      {enum}: [" + ", ".join(f'"{v}"' for v in allv) + s[e:]
    _write(s)


def add_relationship(table, column, ref_table, ref_column="id", one_to_one=False):
    s = _read()
    i = _block(s, table)
    j = s.index("        Relationships: [", i)
    end = s.index("];\n", j) if s.startswith("        Relationships: [];", j) else s.index("\n        ];\n", j) + 1 + len("        ")
    body = s[j + len("        Relationships: ["):end]
    name = f"{table}_{column}_fkey"
    if name in body:
        return
    rel = (f"\n          {{\n            foreignKeyName: \"{name}\";\n            columns: [\"{column}\"];\n"
           f"            isOneToOne: {'true' if one_to_one else 'false'};\n            referencedRelation: \"{ref_table}\";\n"
           f"            referencedColumns: [\"{ref_column}\"];\n          }},")
    new_body = (body.rstrip() + rel + "\n        ") if body.strip() else (rel + "\n        ")
    _write(s[: j + len("        Relationships: [")] + new_body + s[end:])
