# Architecture Document: iText Knowledge Base Migration

#### 1. High-Level Architecture
The system is designed with a clear separation of concerns between the **authoring experience** within Confluence and the **public viewing experience** on the Refined.com site.

1.  **Confluence Forge Macro**: An app within Confluence that allows content creators to easily embed a placeholder for a GitHub code example.
2.  **Refined.com Activation Script**: A global JavaScript on the public Refined site that finds these placeholders and transforms them into interactive JDoodle code editors and performs other required custom functionalities.

```mermaid
graph TD
    subgraph Confluence Cloud (Authoring)
        A[Content Creator] -->|Edits Page| B(Confluence Editor);
        B -->|Uses Macro| C[GitHub Fetcher Forge Macro];
        C -->|Pastes URL| D{Macro UI (React)};
        D -->|Saves Page| E[Renders Static Placeholder DIV];
    end

    subgraph Refined.com (Public View)
        F[Developer User] -->|Visits Page| G(Refined Site);
        G -- contains --> H[Page Content with Placeholder DIV];
        G -- loads --> I[Global Activation Script];
        I -- finds --> H;
        I -- calls --> J[JDoodle.com Service];
        J -- returns --> K[Interactive Iframe];
        I -- replaces DIV with --> K;
    end

    