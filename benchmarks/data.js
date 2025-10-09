window.BENCHMARK_DATA = {
  "lastUpdate": 1759991802066,
  "repoUrl": "https://github.com/aboundTechOlogy/n8n-mcp",
  "entries": {
    "n8n-mcp Benchmarks": [
      {
        "commit": {
          "author": {
            "email": "andrew@aboundtechology.com",
            "name": "Andrew",
            "username": "aboundTechOlogy"
          },
          "committer": {
            "email": "andrew@aboundtechology.com",
            "name": "Andrew",
            "username": "aboundTechOlogy"
          },
          "distinct": true,
          "id": "ef6b4f45770f9cad51cf4eaefe3c43b70ac0c3a2",
          "message": "docs: update GCP deployment guide with VM audit findings\n\n- Added verified VM state (abound-infra-vm, Node.js v18, n8n in Docker)\n- Updated Step 1 with actual system configuration\n- Removed redundant DEPLOYMENT_SUMMARY.md\n- Guide now reflects real production environment\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
          "timestamp": "2025-10-09T02:06:38-04:00",
          "tree_id": "de0965a05f531dcf437a800fc1977b5fd2bbd18a",
          "url": "https://github.com/aboundTechOlogy/n8n-mcp/commit/ef6b4f45770f9cad51cf4eaefe3c43b70ac0c3a2"
        },
        "date": 1759991801758,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0196,
            "range": "0.28159999999999996",
            "unit": "ms",
            "extra": "50901 ops/sec"
          },
          {
            "name": "sample - array sorting - large",
            "value": 3.2783,
            "range": "0.8553999999999999",
            "unit": "ms",
            "extra": "305 ops/sec"
          },
          {
            "name": "sample - string concatenation",
            "value": 0.0049,
            "range": "0.28700000000000003",
            "unit": "ms",
            "extra": "203302 ops/sec"
          },
          {
            "name": "sample - object creation",
            "value": 0.0686,
            "range": "0.4085",
            "unit": "ms",
            "extra": "14585 ops/sec"
          }
        ]
      }
    ]
  }
}