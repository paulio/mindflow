# Serialization Contract

## Purpose
Guarantee stable JSON ordering & schema conformance for persistence, export (future), and deterministic tests.

## Ordering Rules
1. Graph object serialized first.
2. Nodes array sorted by: created ASC, then id ASC (tie-break) to ensure new nodes append at end logically.
3. Edges array sorted by: created ASC, then id ASC.
4. Within nodes/edges properties order is stable per JSON schema definition.

## Deterministic ID Strategy
- Node ID: UUID v4 (no semantic meaning) — randomness acceptable; ordering stabilized by created timestamp.
- Edge ID: If deterministic edge IDs desired use hash(`${min(nodeA,nodeB)}-${max(nodeA,nodeB)}`); MVP may use UUID; tests allow either but ensure uniqueness and referential integrity.

## Validation Steps (Contract Tests)
- Validate document against `persistence-schema.json`.
- Assert no duplicate node IDs or edge unordered pairs.
- Assert node text length <=255.
- Assert schemaVersion === 1.
- Assert lastModified >= max(node.lastModified, any edge.created).

## Future Schema Evolution
- Add `direction` to edges: optional enum ["forward","reverse"]; default omitted = undirected.
- Add `tags` to node (array of short strings) — requires node text length constraint revalidation.

## Failure Handling
- On load: invalid node entry -> skip & increment `skippedNodes` counter (max threshold triggers warning banner).
- On save: validation failure stops batch; surfaces error and does not partially commit.
