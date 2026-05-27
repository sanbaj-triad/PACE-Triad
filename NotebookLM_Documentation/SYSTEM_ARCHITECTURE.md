# PACE Application Architecture

This document provides a comprehensive structural mapping of the PACE Application bridging the Nginx React frontend into the Python FastAPI backend, culminating in the database schemas mapping.

## Infrastructure Map (Cloud Deployment)

```mermaid
flowchart TD
    %% Global Networking
    Internet((Internet / HTTPS)) --> LB[Google Cloud Load Balancer]
    
    subgraph Google Cloud Run 
        LB --> NGINX[Nginx Server Container]
        
        subgraph Frontend Execution
            NGINX --> SPA[React Single Page Application]
        end
        
        SPA -- "REST JSON HTTP / Token Authorization" --> API[FastAPI Uvicorn Container]
    end

    subgraph Google Cloud Storage 
        API -- "Bucket Read/Write" --> Storage[(Media / Invoice Bucket)]
    end
    
    subgraph Google Cloud SQL
        API -- "SQLAlchemy ORM (TCP)" --> DB[(MySQL Database)]
    end
```

## Security & Authentication Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Route_Auth as Dependencies.py
    participant DB as MySQL

    User->>Frontend: Enter Credentials
    Frontend->>Route_Auth: POST /token
    Route_Auth->>DB: Query User & Check "locked_out" and "is_active"
    DB-->>Route_Auth: Verified Constraints
    Route_Auth-->>Frontend: Issue JWT Bearer Token
    Frontend->>Frontend: Store in LocalStorage / AuthContext
    
    Note over Frontend, Route_Auth: Subsequent API Calls
    Frontend->>Route_Auth: GET /projects/ (Bearer Token)
    Route_Auth->>DB: get_current_active_user()
    DB-->>Route_Auth: User Validity Re-Check
    Route_Auth-->>Frontend: Payload Delivered
```

## Core Relational Map (ERD)

This Entity-Relationship Diagram outlines the operational hierarchies mapping your core Python FastAPI Data Models (`app/models.py`).

```mermaid
erDiagram
    %% Core Entities
    USER {
        int id PK
        string username
        string role
        string location_id FK
        boolean locked_out
        boolean is_active
        boolean has_financial_access
    }

    CUSTOMER {
        int id PK
        string name
        int payment_terms
    }

    LOCATION {
        int id PK
        string name
        int customer_id FK
    }

    PROJECT {
        int id PK
        string project_unique_id
        int customer_id FK
        int pm_id FK
        string status
        float budget
    }

    MILESTONE {
        int id PK
        string name
        int project_id FK
        float cost
    }

    TASK {
        int id PK
        int project_id FK
        int milestone_id FK
        int assigned_to_id FK
        string name
        string task_type
    }

    INVOICE {
        int id PK
        int project_id FK
        string status
        float total_amount
    }

    EXPENSE {
        int id PK
        int user_id FK
        int project_id FK
        float amount
        boolean billable
    }

    %% Relationships
    CUSTOMER ||--o{ PROJECT : Commissions
    CUSTOMER ||--o{ LOCATION : Has
    LOCATION ||--o{ USER : "Region Association"
    USER ||--o{ PROJECT : "Manages (PM)"
    USER ||--o{ TASK : "Executes"
    USER ||--o{ EXPENSE : "Incurs"
    PROJECT ||--o{ MILESTONE : "Contains"
    PROJECT ||--o{ TASK : "Contains"
    PROJECT ||--o{ INVOICE : "Generates"
    PROJECT ||--o{ EXPENSE : "Accrues"
    MILESTONE ||--o{ TASK : "Groups"
```

## Front-End React Component Matrix

This diagram maps how the React frontend cascades routing properties securely through to the actual operational pages mapping exactly to your active file structure inside `frontend/src/`.

```mermaid
flowchart LR
    Origin[index.jsx] --> App[App.jsx]
    App --> Route[React Router DOM]
    
    Route --> AuthLayout[Auth Layout]
    AuthLayout --> Login[Login Form]
    
    Route --> Protected[Protected Route]
    Protected --> GlobalContext[Auth / System Context Providers]
    
    GlobalContext --> Main[Main Layout / Sidebar]
    
    Main --> Nav1[Dashboard & Workspace]
    Main --> Nav2[Financial Management]
    Main --> Nav3[System Ops & HR]
    
    Nav1 --> ProjectGantt[Project Timeline]
    Nav1 --> MyAnalytics[Recharts Analytics]
    
    Nav2 --> Invoices[Invoice Controls]
    Nav2 --> Expenses[Expense Sheets & Capture]
    
    Nav3 --> PTO[Global Time Tracking]
    Nav3 --> OrgChart[Regional Drag-and-Drop Chart]
```
