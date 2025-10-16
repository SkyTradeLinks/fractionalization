# Git Branching Strategy & Workflow

## 🌿 Branch Structure

The project follows a standard Git Flow approach:

```
main (production)
  └── develop (integration)
      └── mohtashim/dev (your work)
```

## 🚀 Getting Started with Your Branch

### Step 1: Create Your Development Branch

Since you're already on `mohtashim/dev`, you're good! But for future reference:

```bash
# Make sure you're on the latest code
git checkout main
git pull origin main

# Create and switch to your branch
git checkout -b mohtashim/dev

# Push your branch to remote
git push -u origin mohtashim/dev
```

### Step 2: Daily Workflow

```bash
# Check status
git status

# Stage your changes
git add .

# Commit with a meaningful message
git commit -m "feat: add redeem and redemption components"

# Push to your branch
git push origin mohtashim/dev
```

## 📝 Commit Message Convention

Follow conventional commits:

```bash
# Features
git commit -m "feat: add vault explorer page"
git commit -m "feat: implement fractionalization workflow"

# Fixes
git commit -m "fix: correct wallet adapter integration"
git commit -m "fix: resolve responsive layout issues"

# Documentation
git commit -m "docs: add frontend README"
git commit -m "docs: update hook documentation"

# Styling
git commit -m "style: improve dark mode colors"
git commit -m "style: add responsive breakpoints"

# Refactoring
git commit -m "refactor: extract vault card component"
git commit -m "refactor: simplify hook logic"

# Chores
git commit -m "chore: update dependencies"
git commit -m "chore: cleanup unused imports"
```

## 🔄 Creating a Pull Request

### When to Create a PR

- Feature is complete and tested
- Code builds without errors
- All TypeScript types are correct
- Components are responsive
- Dark/light mode works

### PR Workflow

1. **Push your latest changes**
   ```bash
   git push origin mohtashim/dev
   ```

2. **Create PR on GitHub**
   - Go to: https://github.com/SkyTradeLinks/fractionalization
   - Click "Pull Requests" → "New Pull Request"
   - Base: `develop` ← Compare: `mohtashim/dev`

3. **PR Template**
   ```markdown
   ## 📋 Description
   Completed frontend implementation for the fractionalization protocol
   
   ## ✨ What's New
   - ✅ Explorer page with vault filtering
   - ✅ Vault details page (dynamic route)
   - ✅ Fractionalization workflow (2-step process)
   - ✅ Redeem interface
   - ✅ Redemption history page
   - ✅ Full responsive design (390px-1920px)
   - ✅ Dark/light mode support
   - ✅ Mock data system for parallel development
   - ✅ TypeScript types and JSDoc documentation
   
   ## 🎯 Components Added
   - `RedeemInterface` - Redeem fractional tokens UI
   - `RedemptionHistory` - Track redemption requests
   - `Badge` - Status indicator component
   - Additional hooks and utilities
   
   ## 📱 Testing
   - [x] Mobile (390px+) tested
   - [x] Tablet (640px+) tested
   - [x] Desktop (1024px+) tested
   - [x] Dark mode tested
   - [x] Light mode tested
   - [x] Build passes (`npm run build`)
   
   ## 📚 Documentation
   - Added `FRONTEND_README.md` with full documentation
   - JSDoc on all hooks
   - Type definitions for all interfaces
   
   ## 🔗 Related Issues
   Closes #[issue-number]
   ```

4. **Request Review**
   - Tag reviewers (e.g., @Marcin Zduniak)
   - Wait for approval
   - Address any requested changes

## 🔄 Keeping Your Branch Up to Date

If `develop` or `main` gets updated while you're working:

```bash
# Fetch latest changes
git fetch origin

# Option 1: Merge (preserves history)
git checkout mohtashim/dev
git merge origin/develop

# Option 2: Rebase (cleaner history, recommended)
git checkout mohtashim/dev
git rebase origin/develop

# If there are conflicts, resolve them, then:
git add .
git rebase --continue

# Force push after rebase (only to your branch!)
git push --force-with-lease origin mohtashim/dev
```

## 🏷️ Tagging Releases

When a feature is merged to `main`:

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release: Frontend MVP"
git push origin v1.0.0
```

## 🚨 Emergency Fixes (Hotfix)

If you need to fix something in production:

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-bug-fix

# Make your fix
# ... edit files ...

git commit -m "fix: critical bug in vault display"
git push origin hotfix/critical-bug-fix

# Create PR to both main and develop
```

## 📊 Useful Git Commands

```bash
# View commit history
git log --oneline --graph --all

# Check what changed
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git restore .

# View remote branches
git branch -r

# Delete local branch (after PR merged)
git branch -d mohtashim/dev

# Clean up old branches
git fetch --prune
```

## 👥 Team Coordination

### Before Starting Work
1. Check if someone else is working on similar features
2. Communicate in team chat
3. Pull latest changes

### During Work
1. Push regularly (at least daily)
2. Keep commits atomic (one feature/fix per commit)
3. Update team on progress

### After Work
1. Create PR with detailed description
2. Tag relevant team members
3. Be responsive to feedback

## 🎯 Current Status

### Your Branch: `mohtashim/dev`
**Status**: ✅ Ready for PR

**Completed Work**:
- All frontend pages implemented
- Full responsive design
- Mock data system in place
- TypeScript types defined
- Documentation added

**Next Steps**:
1. Commit all changes
2. Push to `mohtashim/dev`
3. Create PR to `develop`
4. Request review from team

## 📦 Before Creating PR Checklist

- [ ] Run `npm run build` - passes without errors
- [ ] Run `npm run lint` - no critical issues
- [ ] Run `npm run format` - code is formatted
- [ ] All files have proper JSDoc comments
- [ ] No `any` types in TypeScript
- [ ] Responsive on all screen sizes
- [ ] Dark/light mode both work
- [ ] Mock data is documented
- [ ] README is updated

## 🔗 Useful Links

- **Repository**: https://github.com/SkyTradeLinks/fractionalization
- **GitHub Flow**: https://guides.github.com/introduction/flow/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **PR Best Practices**: https://github.blog/developer-skills/github/pull-request-best-practices/

---

**Remember**: Always work on feature branches, never directly on `main` or `develop`!
