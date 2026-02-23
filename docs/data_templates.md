# 数据录入模板

请按照以下格式填写数据，我将帮你生成 SQL 或 Seed 脚本。

## 1. 部门 (Departments)
| ID (可选) | 部门名称 (Name) | 上级部门ID (ParentID) |
| :--- | :--- | :--- |
| 1 | 总经办 | NULL |
| 2 | 销售部 | 1 |
| 3 | 人事部 | 1 |
| 4 | 财务部 | 1 |

## 2. 员工 (Users)
* **角色 (Role)**: ADMIN, MANAGER, SUPERVISOR, EMPLOYEE, FINANCE, HR
* **状态 (Status)**: PROBATION (试用), REGULAR (正式), TERMINATED (离职)

| 姓名 (Name) | 手机号/账号 (Phone/Username) | 密码 (Password) | 角色 (Role) | 部门ID (DeptID) | 直属领导ID (SupervisorID) | 状态 (Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 管理员 | 13800000001 | 123456 | ADMIN | 1 | NULL | REGULAR |
| 销售总监 | 13800000002 | 123456 | MANAGER | 2 | 1 | REGULAR |
| 销售经理A | 13800000003 | 123456 | SUPERVISOR | 2 | 2 | REGULAR |
| 销售员B | 13800000004 | 123456 | EMPLOYEE | 2 | 3 | PROBATION |

## 3. 渠道 (Channels)
* **类型 (Type)**: COMPANY (公司), INDIVIDUAL (个人), ONLINE (线上), OFFLINE (线下)
* **状态 (Status)**: ACTIVE (启用), INACTIVE (禁用)

| 渠道名称 (Name) | 类型 (Type) | 渠道点数 (Points) | 渠道费用 (Cost) | 状态 (Status) |
| :--- | :--- | :--- | :--- | :--- |
| 抖音广告 | ONLINE | 0 | 5000 | ACTIVE |
| 线下地推 | OFFLINE | 0 | 2000 | ACTIVE |
| 合作伙伴A | COMPANY | 10 | 0 | ACTIVE |

## 4. 销售目标 (Sales Targets)
* **月份 (Month)**: YYYY-MM
* **金额 (Amount)**: 数字

| 员工ID (UserID) | 月份 (Month) | 目标金额 (Amount) |
| :--- | :--- | :--- |
| 3 (销售经理A) | 2023-10 | 100000 |
| 4 (销售员B) | 2023-10 | 50000 |
