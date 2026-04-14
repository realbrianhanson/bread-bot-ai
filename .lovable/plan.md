

# Make Chat Delete/Rename Actions More Discoverable

## Problem
The delete and rename buttons on conversations are hidden behind hover (`opacity-0 group-hover:opacity-100`), making them invisible on touch devices and easy to miss on desktop. The conversation list is also constrained to only 192px height (`max-h-48`), making it hard to manage many chats.

## Plan

### 1. Add a right-click context menu or "more" button to each conversation
Replace the hover-only icon buttons with a visible **three-dot menu** (MoreVertical icon) that's always shown on the active conversation and on hover for others. The dropdown menu will contain "Rename" and "Delete" options.

**File:** `src/components/chat/ConversationList.tsx`
- Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` and `MoreVertical` icon
- Replace the current hover-only button group with a `DropdownMenu` containing Rename and Delete items
- Make the three-dot trigger always visible on the active conversation, hover-visible on others

### 2. Increase conversation list height on desktop
**File:** `src/pages/Dashboard.tsx`
- Change `max-h-48` to `max-h-64` or remove the max-height constraint so users can see and manage more conversations

These two changes will make delete (and rename) easy to find on both desktop and mobile.

