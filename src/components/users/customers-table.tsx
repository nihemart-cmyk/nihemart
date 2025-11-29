"use client";

import { useMemo, useState, useEffect } from "react";
import { DataTable } from "./data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createCustomerColumns, type Customer } from "./customer-columns";
import { useUsers, type SortBy } from "@/hooks/useUsers";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function CustomerTable() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [viewCustomerModalOpened, setViewCustomerModalOpened] =
    useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch initial data (server-side filtering)
  const {
    users,
    loading,
    error,
    page,
    limit,
    setPage,
    setLimit,
    totalCount,
    filteredCount,
    updateUserRole,
    deleteUser,
    filters,
    setSortBy,
    setDateRange,
    resetFilters,
    setSearch,
  } = useUsers();

  // Local state for simple filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [customRangeOpen, setCustomRangeOpen] = useState(false);

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewCustomerModalOpened(true);
  };

  const handleCloseModal = () => {
    setViewCustomerModalOpened(false);
  };

  // Map users to Customer type for DataTable
  const customers: Customer[] = users
    .filter((u) => u.role === "user") // Only show customers, not admins/managers/etc
    .map((u) => ({
      id: u.id,
      name: u.full_name || u.email,
      email: u.email,
      phone: u.phone || "",
      location: (u as any).city || "",
      orderCount: u.orderCount || 0,
      totalSpend: u.totalSpend || 0,
      status: "Active",
      role: u.role,
      totalOrders: u.orderCount || 0,
      completedOrders: (u as any).completedOrders || 0,
      cancelledOrders: (u as any).cancelledOrders || 0,
      registeredDate: u.created_at,
    }));

  // When searchQuery changes, update server-side filter
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchQuery || "");
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, setSearch, setPage]);

  const columns = useMemo(
    () =>
      createCustomerColumns(
        handleViewCustomer,
        async (customerId: string, makeAdmin?: boolean) => {
          // Toggle role
          const role = makeAdmin ? "admin" : "user";
          await updateUserRole(customerId, role as any);
        },
        async (customerId: string) => {
          // Soft delete user
          await deleteUser(customerId, false);
        }
      ),
    [handleViewCustomer, updateUserRole, deleteUser]
  );

  // Apply filter button (simplified)
  const handleApplyFilters = () => {
    setSortBy((filters.sortBy || "recent") as SortBy);

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    setDateRange(from, to);

    setPage(1);
  };

  // Reset all filters (simplified)
  const handleResetFilters = () => {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    resetFilters();
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    filters.fromDate ||
      filters.toDate ||
      filters.minOrders !== null ||
      filters.maxOrders !== null ||
      filters.minSpend !== null ||
      filters.maxSpend !== null ||
      searchQuery
  );

  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / limit));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-semibold">
                  Customer Details
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {filteredCount ?? 0} of {totalCount ?? 0} customers
                  {hasActiveFilters && " (filtered)"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="max-w-xs"
                />
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? "Hide Filters" : "Filters"}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Simple Filters Section */}
            {showFilters && (
              <div className="border-t pt-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        // Today
                        const t = new Date();
                        const start = new Date(
                          t.getFullYear(),
                          t.getMonth(),
                          t.getDate()
                        );
                        const end = new Date(start);
                        end.setDate(end.getDate() + 1);
                        setDateRange(start, end);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        // Last 7 days
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - 6);
                        setDateRange(start, end);
                      }}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        // All time
                        setDateRange(null, null);
                      }}
                    >
                      All time
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCustomRangeOpen(!customRangeOpen)}
                    >
                      Custom
                    </Button>
                  </div>

                  {customRangeOpen && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                      <Button
                        onClick={() => {
                          const from = fromDate ? new Date(fromDate) : null;
                          const to = toDate ? new Date(toDate) : null;
                          setDateRange(from, to);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  )}

                  <div className="ml-auto">
                    <Label className="text-xs font-medium mb-2 block">
                      Per Page
                    </Label>
                    <Select
                      value={String(limit)}
                      onValueChange={(v) => {
                        setLimit(Number(v));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      setSearch("");
                      setSearchQuery("");
                      resetFilters();
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading customers...</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No customers found
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={filteredBySearch} />
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        className={
                          page === 1 ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                    {Array.from({
                      length: Math.min(totalPages, 5),
                    }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <Dialog open={viewCustomerModalOpened} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Customer Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {getInitials(selectedCustomer?.name ?? "")}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedCustomer?.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {selectedCustomer?.email}
                  </p>
                  {selectedCustomer?.registeredDate && (
                    <p className="text-gray-500 text-xs">
                      Registered:{" "}
                      {new Date(
                        selectedCustomer.registeredDate
                      ).toLocaleDateString("en-RW", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Customer Info
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedCustomer?.phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {selectedCustomer?.location || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Order Overview
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedCustomer?.totalOrders}
                    </div>
                    <div className="text-xs text-blue-600">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedCustomer?.completedOrders}
                    </div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedCustomer?.cancelledOrders}
                    </div>
                    <div className="text-xs text-red-600">Cancelled</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Total Spend
                </h4>
                <div className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat("en-RW", {
                    style: "currency",
                    currency: "RWF",
                    maximumFractionDigits: 0,
                  }).format(selectedCustomer?.totalSpend ?? 0)}
                </div>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </>
  );
}
