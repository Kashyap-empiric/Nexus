# Git Branch Structure

This document provides a visual representation of the Git branch strategy used in the Nexus repository. 

Our branch hierarchy generally flows as follows:
- **`main`**: The production-ready code.
- **`staging`**: Pre-production environment for final testing.
- **`development`**: The main integration branch for all new features.
- **`feat/*`**: Ephemeral feature branches where individual features are developed before being merged into `development`.

## Branch Relationship Flowchart

```mermaid
graph TD
    %% Define styles
    classDef prod fill:#ff4757,stroke:#333,stroke-width:2px,color:#fff;
    classDef stage fill:#ffa502,stroke:#333,stroke-width:2px,color:#fff;
    classDef dev fill:#1e90ff,stroke:#333,stroke-width:2px,color:#fff;
    classDef feat fill:#2ed573,stroke:#333,stroke-width:2px,color:#fff;

    %% Nodes
    M[main]:::prod
    S[staging]:::stage
    D[development]:::dev
    
    FA[feat/auth]:::feat
    FC[feat/chat]:::feat
    FS[feat/socket]:::feat
    FP[feat/presence]:::feat
    FM[feat/message]:::feat

    %% Connections
    M ---|merges from| S
    S ---|merges from| D
    
    D -->|branches to| FA
    D -->|branches to| FC
    D -->|branches to| FS
    D -->|branches to| FP
    D -->|branches to| FM
    
    FA -.->|merges into| D
    FC -.->|merges into| D
    FS -.->|merges into| D
    FP -.->|merges into| D
    FM -.->|merges into| D
```

## Conceptual Git History Diagram

```mermaid
gitGraph
    commit id: "Initial Commit"
    branch staging
    branch development
    checkout development
    commit id: "Setup baseline"
    
    branch feat/auth
    checkout feat/auth
    commit id: "Add auth"
    checkout development
    merge feat/auth
    
    branch feat/chat
    checkout feat/chat
    commit id: "Add DMs"
    checkout development
    merge feat/chat
    
    branch feat/socket
    checkout feat/socket
    commit id: "Add real-time"
    checkout development
    merge feat/socket
    
    branch feat/presence
    checkout feat/presence
    commit id: "Add online status"
    checkout development
    merge feat/presence
    
    branch feat/message
    checkout feat/message
    commit id: "Add edit/delete"
    checkout development
    merge feat/message
    
    checkout staging
    merge development id: "Release Candidate"
    
    checkout main
    merge staging id: "Production Release"
```

## Active Branches (As of June 2026)
- `main`
- `staging`
- `development` (HEAD)
- `feat/auth`
- `feat/chat`
- `feat/socket`
- `feat/presence`
- `feat/message`
