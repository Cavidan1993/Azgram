# AzGram Database Architecture & ER Diagram

## 1. Overview
AzGram is a production-oriented social network with a budget of 0 AZN using **Supabase Free Tier (PostgreSQL 15+)**.
All persistent data is stored in PostgreSQL with strict Row Level Security (RLS), atomic transactional triggers, foreign key constraints, and anti-spam rate limiting.

## 2. Mermaid Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 id"
    auth_users ||--o| user_roles : "1:1 user_id"
    profiles ||--o{ posts : "authors"
    profiles ||--o{ comments : "writes"
    profiles ||--o{ likes : "places"
    profiles ||--o{ follows : "follower (outgoing)"
    profiles ||--o{ follows : "following (incoming)"
    profiles ||--o{ notifications : "receives"
    profiles ||--o{ notifications : "triggers (sender)"
    profiles ||--o{ reports : "reporter"
    profiles ||--o{ reports : "reported user"
    posts ||--o{ comments : "has"
    posts ||--o{ likes : "receives"
    posts ||--o{ notifications : "referenced in"
    posts ||--o{ reports : "reported post"
    comments ||--o{ notifications : "referenced in"

    profiles {
        uuid id PK "references auth.users"
        text username UK "unique, lowercase, alphanumeric + _."
        text display_name "user display name"
        text bio "user biography"
        text avatar_url "Supabase storage path or public URL"
        boolean is_banned "moderator flag (default false)"
        timestamptz created_at "account creation timestamp"
        timestamptz updated_at "profile update timestamp"
    }

    user_roles {
        uuid user_id PK "references auth.users"
        text role "check: user | moderator | admin"
        timestamptz created_at
    }

    posts {
        uuid id PK "default gen_random_uuid()"
        uuid user_id FK "references profiles(id)"
        text image_url "Supabase storage URL"
        text caption "post text content"
        integer likes_count "denormalized cached count"
        integer comments_count "denormalized cached count"
        boolean is_hidden "flagged by admin as spam/violation"
        timestamptz created_at "cursor pagination anchor"
        timestamptz updated_at
    }

    likes {
        uuid id PK "default gen_random_uuid()"
        uuid post_id FK "references posts(id)"
        uuid user_id FK "references profiles(id)"
        timestamptz created_at
    }

    comments {
        uuid id PK "default gen_random_uuid()"
        uuid post_id FK "references posts(id)"
        uuid user_id FK "references profiles(id)"
        text content "comment body"
        timestamptz created_at
    }

    follows {
        uuid id PK "default gen_random_uuid()"
        uuid follower_id FK "references profiles(id)"
        uuid following_id FK "references profiles(id)"
        timestamptz created_at
    }

    notifications {
        uuid id PK "default gen_random_uuid()"
        uuid recipient_id FK "references profiles(id)"
        uuid sender_id FK "references profiles(id)"
        text type "like | comment | follow"
        uuid post_id FK "optional ref to posts"
        uuid comment_id FK "optional ref to comments"
        boolean is_read "default false"
        timestamptz created_at
    }

    reports {
        uuid id PK "default gen_random_uuid()"
        uuid reporter_id FK "references profiles(id)"
        uuid reported_post_id FK "nullable ref to posts"
        uuid reported_user_id FK "nullable ref to profiles"
        text reason "reason for report"
        text status "pending | resolved | dismissed"
        timestamptz created_at
    }

    rate_limits {
        uuid id PK
        uuid user_id FK
        text action "post | comment"
        timestamptz created_at
    }
```

## 3. Database Constraints & Guarantees
1. **Self-Follow Prevention:**
   `CHECK (follower_id <> following_id)` ensures users can never follow themselves.
2. **Duplicate Follow Prevention:**
   `UNIQUE (follower_id, following_id)` prevents repeated follow spam.
3. **Duplicate Like Prevention:**
   `UNIQUE (post_id, user_id)` guarantees idempotent likes.
4. **Cascade Deletions:**
   Deleting a profile cascades to user's posts, likes, comments, and follows.
   Deleting a post cascades to its likes, comments, and post-linked reports.
5. **Denormalized Counters Consistency:**
   Triggers maintain `likes_count` and `comments_count` directly in PostgreSQL, eliminating `COUNT(*)` table scans on large feeds.
