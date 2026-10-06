# Project: Art By Sukrutha

You are an expert Full Stack Architect, Product Designer, UI/UX Designer, and Senior Next.js Engineer.

Build a production-ready website called "Art By Sukrutha".

The website should initially support a single artist (Sukrutha), but the architecture must be designed from day one to support multiple artists in the future.

---

# Business Goal

Create a professional online art gallery and artist portfolio platform.

Phase 1:
- Showcase Sukrutha's artworks
- Build artist brand
- Collect buyer inquiries
- Display artwork details professionally

Phase 2:
- Support multiple artists
- Artist onboarding
- Artist dashboard
- Artist-specific portfolios

---

# Tech Stack

Frontend:
- Next.js 15+
- TypeScript
- Tailwind CSS
- ShadCN UI

Backend:
- Supabase

Database:
- PostgreSQL via Supabase

Storage:
- Supabase Storage

Hosting:
- Vercel

Authentication:
- Supabase Auth

Form Validation:
- Zod
- React Hook Form

State Management:
- TanStack Query

Icons:
- Lucide React

---

# Design Requirements

Style:
- Minimal
- Premium
- Elegant
- Art Gallery Aesthetic

Color Palette:
- Background: White
- Text: Charcoal Black
- Accent: Deep Terracotta
- Secondary Accent: Warm Beige

Typography:
- Modern Serif for headings
- Clean Sans Serif for body

General Layout:
- Spacious
- Lots of white space
- Professional
- Mobile-first

Responsive:
- Desktop
- Tablet
- Mobile

Accessibility:
- WCAG compliant

---

# Pages Required

## Home Page

Hero Section

Content:

Title:
Art By Sukrutha

Subtitle:
Original Paintings, Heritage Art, Landscapes and Creative Expressions

Buttons:
- View Gallery
- Contact Artist

Sections:

1. Hero Banner
2. Featured Artworks
3. About the Artist
4. Categories
5. Recent Works
6. Contact CTA

---

## Gallery Page

Display all artworks.

Filters:

- Heritage
- Temple Art
- Landscape
- Watercolor
- Acrylic
- Sketches
- Other

Search Features:

- Search by title
- Search by category

View Modes:

- Grid
- Masonry

Artwork Card Must Display:

- Thumbnail
- Artwork Title
- Medium
- Availability
- Short Description

---

## Artwork Details Page

Dynamic Route

Example:

/artworks/lepakshi-temple

Display:

- Large Artwork
- Multiple Images
- Title
- Year
- Medium
- Dimensions
- Category
- Availability
- Description
- Story Behind the Artwork
- Price (Optional)

Buttons:

- Contact Artist
- Enquire About Purchase

---

## About Page

Display:

- Artist Photograph
- Biography
- Artistic Journey
- Inspiration
- Skills
- Techniques

Social Links:

- Instagram
- YouTube
- Facebook
- Pinterest

---

## Contact Page

Contact Form

Fields:

- Name
- Email
- Phone
- Subject
- Message

Submission:

- Save to Database
- Show Success Message

---

# Admin Dashboard

Protected Route:

/admin

Features:

Dashboard
Artwork Management
Inquiry Management

Artwork Management:

- Add Artwork
- Edit Artwork
- Delete Artwork
- Mark Available
- Mark Sold
- Upload New Images

---

# Database Schema

Create migrations and SQL.

## Artists Table

Fields:

id UUID
name
slug
bio
profile_image
instagram
youtube
facebook
website
created_at

Example:

name = Sukrutha Karthik
slug = sukrutha

---

## Artworks Table

Fields:

id UUID
artist_id
title
slug
description
story
year
medium
category
width
height
price
availability
featured
cover_image
created_at

Availability Values:

available
sold
reserved

---

## Artwork Images Table

Fields:

id UUID
artwork_id
image_url
display_order

---

## Inquiries Table

Fields:

id UUID
artwork_id
name
email
phone
subject
message
created_at

---

# Storage Design

Use Supabase Storage.

Bucket:

artworks

Folder Structure:

artworks/
    sukrutha/
        heritage/
        landscapes/
        watercolor/
        acrylic/
        sketches/

File Naming Convention:

category-artwork-slug-main.jpg
category-artwork-slug-thumb.jpg

Examples:

heritage-lepakshi-main.jpg
heritage-lepakshi-thumb.jpg

---

# SEO Requirements

Implement:

- Dynamic metadata
- Open Graph
- Twitter Cards
- robots.txt
- sitemap.xml

Generate Artwork URLs:

/artworks/lepakshi-temple-watercolor

All artwork pages must be SEO optimized.

---

# Future Multi-Artist Support

Design architecture for expansion.

Future Possibilities:

artist1.artbysukrutha.com
artist2.artbysukrutha.com

OR

/artists/sukrutha
/artists/naveen

Requirements:

- Artist profiles
- Independent galleries
- Independent admin access

---

# Nice To Have Features

Dark Mode

Blog

Exhibitions Section

Upcoming Events

Testimonials

Artwork Collections

Certificate Of Authenticity

Downloadable Catalog PDF

AI-generated Artwork Descriptions

Print-on-demand integration

Etsy integration

Instagram feed

Newsletter

---

# Folder Structure

Use feature-based architecture.

Example:

src/
  app/
  components/
  features/
  lib/
  services/
  hooks/
  types/
  utils/

---

# Development Standards

Requirements:

- TypeScript strict mode
- Reusable components
- Clean architecture
- SOLID principles
- Error boundaries
- Loading states
- Empty states

---

# Deliverables

Generate:

1. Complete Next.js project
2. Supabase schema
3. Migration scripts
4. Reusable components
5. Responsive layouts
6. Admin dashboard
7. Sample seed data
8. Deployment instructions
9. Environment variable documentation
10. README.md

The generated application must be ready to deploy on Vercel with Supabase backend.