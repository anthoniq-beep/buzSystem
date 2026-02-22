// Enum definitions need to be compatible with erasableSyntaxOnly or isolatedModules
// Using const enum or regular enum can be tricky with some bundlers if not configured right.
// Let's use standard enum but ensure tsconfig allows it.
// The error was "erasableSyntaxOnly" is enabled.
// We disabled it in tsconfig.app.json (or should have).

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
  FINANCE = 'FINANCE',
  HR = 'HR',
}

export enum CustomerStatus {
  LEAD = 'LEAD',
  CHANCE = 'CHANCE',
  CALL = 'CALL',
  TOUCH = 'TOUCH',
  PENDING = 'PENDING',
  DEAL = 'DEAL',
  CHURNED = 'CHURNED',
}

export enum SaleStage {
  CHANCE = 'CHANCE',
  CALL = 'CALL',
  TOUCH = 'TOUCH',
  DEAL = 'DEAL',
}

export enum EmployeeStatus {
  PROBATION = 'PROBATION',
  REGULAR = 'REGULAR',
  TERMINATED = 'TERMINATED',
}

export interface Department {
  id: number;
  name: string;
  parentId?: number;
  parent?: Department;
  children?: Department[];
  managerId?: number;
  manager?: User;
  users?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  phone: string;
  role: Role;
  status: EmployeeStatus;
  departmentId?: number;
  department?: Department;
  supervisorId?: number;
  supervisor?: User;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTarget {
  id: number;
  userId: number;
  user: User;
  month: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  companyName?: string;
  status: CustomerStatus;
  ownerId: number;
  owner: User;
  lastContactAt: string;
  createdAt: string;
  saleLogs?: SaleLog[];
}

export interface SaleLog {
  id: number;
  customerId: number;
  actorId: number;
  actor: User;
  stage: SaleStage;
  note: string;
  isEffective: boolean;
  occurredAt: string;
}
