/**
 * Shared Type Definitions for Aquarius Tattoo Studio Management System
 */

export type UserRole = "Admin" | "Employee";
export type UserStatus = "Active" | "Inactive";
export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type ExpenseStatus = "Pending" | "Approved" | "Rejected";
export type AttendanceStatus = "Checked In" | "Checked Out" | "Absent";

export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  status: UserStatus;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  notes?: string;
  stockStatus: StockStatus;
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  receiptImage?: string;
  status: ExpenseStatus;
  employeeId: string; // User ID
  approvedBy?: string; // User ID
  createdAt: string;
}

export interface Attendance {
  _id: string;
  employeeId: string; // User ID
  checkInTime: string;
  checkOutTime?: string;
  workingHours?: number;
  gpsLocation?: string;
  date: string;
  status: AttendanceStatus;
}

export interface Customer {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  address?: string;
  totalVisits: number;
  totalSpending: number;
  createdAt: string;
}

export interface CustomerHistoryItem {
  _id: string;
  customerId: string;
  serviceType: "Tattoo" | "Piercing" | "Consultation" | "Touch-Up";
  tattooDetails?: string;
  piercingDetails?: string;
  amount: number;
  employeeId: string;
  serviceDate: string;
}

export interface Sale {
  _id: string;
  customerId: string;
  employeeId: string;
  serviceType: "Tattoo" | "Piercing" | "Aftercare Product" | "Other";
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: "Cash" | "Card" | "Bank Transfer" | "UPI";
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "danger";
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  _id: string; // "default" or user specific
  theme: "light" | "dark";
  notificationEnabled: boolean;
  profileSettings: {
    studioName: string;
    studioEmail: string;
    studioPhone: string;
    studioAddress: string;
  };
}

// Session state types
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  profileImage?: string;
}
