"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

import type { Customer, CreditAccount } from "@/generated/prisma/client";
import { deleteCustomer } from "@/features/customers/actions";
import { formatPrice } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerDialog } from "./customer-dialog";

type CustomerWithCredit = Omit<Customer, "creditLimit"> & {
  creditLimit: any;
  creditAccount: { outstandingBalance: number } | null;
  shop?: { name: string } | null;
};

export function CustomerTable({
  customers,
  isGlobal,
  currency = "USD",
  activeRole,
  isSuperAdmin,
}: {
  customers: CustomerWithCredit[];
  isGlobal?: boolean;
  currency?: string;
  activeRole?: string;
  isSuperAdmin?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithCredit | null>(null);
  const [pending, startTransition] = useTransition();

  const columns: ColumnDef<CustomerWithCredit>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Full Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          <Link href={`/customers/${row.original.id}`} className="hover:underline text-primary">
            {row.getValue("fullName")}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <div>{row.getValue("phone") || "—"}</div>,
    },
    ...(isGlobal ? [{
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }: { row: any }) => (
        <Badge variant="outline" className="text-xs bg-muted/50">{row.original.shop?.name || "Unknown"}</Badge>
      ),
    }] : []),
    {
      id: "creditBalance",
      header: "Balance",
      accessorFn: (row) => row.creditAccount?.outstandingBalance.toString(),
      cell: ({ row }) => {
        const balance = Number(row.original.creditAccount?.outstandingBalance || 0);
        return (
          <div className={`font-medium ${balance > 0 ? "text-destructive" : ""}`}>
            {formatPrice(balance, currency)}
          </div>
        );
      },
    },
    {
      accessorKey: "creditLimit",
      header: "Credit Limit",
      cell: ({ row }) => <div>{formatPrice(Number(row.original.creditLimit || 0), currency)}</div>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive");
        return <Badge variant={isActive ? "secondary" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>;
      },
    },
    ...(isGlobal || (activeRole === "INVENTORY" && !isSuperAdmin) ? [] : [{
      id: "actions",
      cell: ({ row }: { row: any }) => {
        const customer = row.original;

        const handleDelete = () => {
          if (confirm(`Are you sure you want to delete ${customer.fullName}?`)) {
            startTransition(async () => {
              const res = await deleteCustomer(customer.id);
              if (res.success) {
                toast.success("Customer deleted");
              } else {
                toast.error(res.error || "Failed to delete customer");
              }
            });
          }
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0" disabled={pending}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {activeRole !== "CASHIER" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }]),
  ];

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    globalFilterFn: "includesString",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search customers..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        {!isGlobal && activeRole !== "INVENTORY" && (
          <CustomerDialog activeRole={activeRole} isSuperAdmin={isSuperAdmin} />
        )}
      </div>

      <CustomerDialog
        open={!!editingCustomer}
        onOpenChange={(open) => {
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer as any}
        activeRole={activeRole}
        isSuperAdmin={isSuperAdmin}
      />

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}
