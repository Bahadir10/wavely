# Contributing to Wavely 📻

Thank you for your interest in contributing to Wavely! We welcome all contributions, bug reports, and feature proposals.

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or v22 recommended)
- [Expo CLI](https://docs.expo.dev/)
- [Git](https://git-scm.com/)

### Clone and Install
```bash
git clone https://github.com/bhdr78/wavely.git
cd wavely
npm install --legacy-peer-deps
```

### Running Locally
```bash
# Start Metro bundler (Expo Go / Development build)
npx expo start

# Run Web Preview in your browser
npm run web
```

---

## 🧪 Testing & Code Quality

Before opening a pull request, ensure all quality checks pass:

```bash
# Typecheck TypeScript files
npm run typecheck

# Run ESLint
npm run lint

# Run Jest unit tests
npm test
```

---

## 📋 Pull Request Guidelines

1. **Create a topic branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit with conventional commit messages:**
   - `feat: add sleep timer`
   - `fix: resolve lock screen metadata encoding`
   - `docs: update setup guide`
3. **Keep code documented:**
   - Keep code comments and docstrings in English.
   - Maintain Turkish & English translations in `src/constants/i18n.ts`.
4. **Open a PR:**
   - Fill out the PR template with relevant details and screenshots.

---

## 📜 License
By contributing to Wavely, you agree that your contributions will be licensed under the MIT License.
