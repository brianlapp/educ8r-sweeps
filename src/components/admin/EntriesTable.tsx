
import React from "react";
import { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteEntryButton } from "@/components/admin/DeleteEntryButton";

interface EntriesTableProps {
  entries: Tables<'entries'>[];
  onDeleteEntry: (id: string) => Promise<void>;
  isDeleting: string | null;
}

export const EntriesTable = ({ entries, onDeleteEntry, isDeleting }: EntriesTableProps) => {
  const columns = [
    {
      header: "First Name",
      accessorKey: "first_name",
    },
    {
      header: "Last Name",
      accessorKey: "last_name",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Referral Code",
      accessorKey: "referral_code",
    },
    {
      header: "Referral Count",
      accessorKey: "referral_count",
    },
    {
      header: "Entry Count",
      accessorKey: "entry_count",
    },
    {
      header: "Total Entries",
      accessorKey: "total_entries",
    },
    {
      header: "Created At",
      accessorKey: "created_at",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
      },
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: ({ row }) => (
        <DeleteEntryButton 
          entryId={row.original.id}
          onDelete={onDeleteEntry}
          isDeleting={isDeleting === row.original.id}
        />
      ),
    },
  ];

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center bg-white p-8 rounded-md shadow">No entries found.</div>
    );
  }

  return (
    <div className="rounded-md border bg-white shadow">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessorKey}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              {columns.map((column) => (
                <TableCell key={`${entry.id}-${column.accessorKey}`}>
                  {column.cell && column.accessorKey !== "actions"
                    ? column.cell({ row: { getValue: () => entry[column.accessorKey], original: entry } })
                    : column.accessorKey === "actions"
                    ? column.cell({ row: { original: entry } })
                    : entry[column.accessorKey]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
