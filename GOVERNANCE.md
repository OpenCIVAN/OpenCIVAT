# Governance

This document describes how OpenCIVAN is governed, who makes decisions, and how the project evolves.

---

## Navigation

| | |
|---|---|
| [Project Roles](#project-roles) | [Decision Making](#decision-making) |
| [Maintainers](#maintainers) | [Becoming a Maintainer](#becoming-a-maintainer) |
| [Releases](#releases) | [Contact](#contact) |

---

## Project Roles

### Users

Anyone who uses OpenCIVAN. Users contribute by reporting bugs, requesting features, and sharing use cases.

### Contributors

Anyone who has had a pull request merged, filed a substantive issue, or improved documentation. Contributors are listed in the repository's GitHub contributors page.

### Maintainers

Contributors who have been granted write access to the repository and are responsible for reviewing pull requests, triaging issues, and making release decisions.

Maintainer responsibilities:

- Review and merge pull requests within a reasonable timeframe
- Triage new issues (label, close duplicates, assign milestones)
- Ensure the project remains stable and well-documented
- Communicate breaking changes clearly in release notes
- Uphold the Code of Conduct

---

## Decision Making

OpenCIVAN uses a **lazy consensus** model for routine decisions:

- A change is accepted if no maintainer objects within **5 business days** of the pull request being opened for review.
- Substantive objections must be accompanied by a rationale and a proposed alternative.
- For significant architectural changes, a public discussion issue should be opened and allowed to run for at least **7 days** before implementation begins.

For breaking changes or major new features, at least **two maintainer approvals** are required before merge.

---

## Maintainers

Current maintainers are listed in [MAINTAINERS.md](MAINTAINERS.md) (TBD — to be created when the project is publicly launched).

---

## Becoming a Maintainer

Any consistent contributor may be nominated for maintainership. Nominations are made by an existing maintainer via a pull request to `MAINTAINERS.md`. The nomination is accepted if no existing maintainer objects within 7 days.

Criteria considered:

- Sustained quality contributions over at least 3 months
- Demonstrated understanding of the project architecture
- Constructive participation in code review and community discussions
- Alignment with the project's goals and Code of Conduct

Maintainers who become inactive for more than 6 months may be moved to emeritus status.

---

## Releases

OpenCIVAN uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

| Type | Trigger |
|---|---|
| Patch | Bug fixes, documentation updates |
| Minor | New features, non-breaking changes |
| Major | Breaking changes to the API, architecture, or data format |

Release notes are published as [GitHub Releases](../../releases) and summarize changes, upgrade notes, and known issues.

---

## Contact

For governance questions or Code of Conduct matters, contact the maintainers through:

- GitHub Discussions (preferred for non-sensitive matters)
- A [private security advisory](../../security/advisories/new) (for sensitive matters)

---

*This document may be updated as the project grows. Changes to governance are made via pull request with at least 7 days of open comment.*
