## Summary

<!-- What does this PR do? One paragraph is enough for small changes. For larger changes, include motivation and approach. -->

Closes #<!-- issue number, if applicable -->

---

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (needs migration notes)
- [ ] Documentation only
- [ ] Refactor (no behavior change)
- [ ] Test coverage improvement
- [ ] Infrastructure / build / CI

---

## Checklist

### Code quality

- [ ] I have followed the [dependency direction rule](docs/architecture.md#frontend-structure): UI → Services → Managers → Core → Utils
- [ ] I have used path aliases (`@UI`, `@Core`, `@Services`, etc.) for all internal imports
- [ ] I have not added mock/placeholder behavior to production code paths
- [ ] Comments explain *why*, not *what* the code does

### Testing

- [ ] Existing tests pass (`npm run test:run`)
- [ ] I have added tests for new behavior (or explained why tests are not needed)
- [ ] I have manually tested the change in a browser

### VR (if applicable)

- [ ] I have tested or considered the behavior in VR mode
- [ ] Touch targets and text are large enough for controller interaction
- [ ] No keyboard-only interactions introduced without VR equivalent

### Documentation

- [ ] `README.md` updated if the change affects setup or main features
- [ ] `docs/` updated if the change affects architecture, APIs, or user workflows
- [ ] `ROADMAP.md` updated if this closes a roadmap item

### Breaking changes

- [ ] Migration notes added (if this is a breaking change)
- [ ] `CHANGELOG.md` entry added (if applicable)

---

## Screenshots / recordings

<!-- For UI changes, include before/after screenshots or a short screen recording. -->

---

## Additional notes

<!-- Anything a reviewer should know: open questions, future work, related PRs. -->
