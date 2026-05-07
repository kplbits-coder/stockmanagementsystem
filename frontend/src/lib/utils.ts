import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

export function getStatusBadge(status: string): { class: string; label: string } {
  switch (status) {
    case 'IN_STOCK':
      return { class: 'badge-green', label: 'In Stock' };
    case 'LOW_STOCK':
      return { class: 'badge-yellow', label: 'Low Stock' };
    case 'OUT_OF_STOCK':
      return { class: 'badge-red', label: 'Out of Stock' };
    default:
      return { class: 'badge-gray', label: status };
  }
}

export function getRoleBadge(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'badge-blue';
    case 'CASHIER':
      return 'badge-green';
    case 'INVENTORY_MANAGER':
      return 'badge-yellow';
    default:
      return 'badge-gray';
  }
}
