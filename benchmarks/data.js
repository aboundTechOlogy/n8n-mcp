window.BENCHMARK_DATA = {
  "lastUpdate": 1759996981533,
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
      },
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
          "id": "0f102c5469fc2b411de5365ee824fa3c9ad5aeda",
          "message": "fix: correct OAuth router options\n\n- Remove resourceServerUrl from OAuth router options\n- Fix TypeScript compilation error\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
          "timestamp": "2025-10-09T04:01:37-04:00",
          "tree_id": "800149d7e8c26aaba2b777c1037da8262ef98ff8",
          "url": "https://github.com/aboundTechOlogy/n8n-mcp/commit/0f102c5469fc2b411de5365ee824fa3c9ad5aeda"
        },
        "date": 1759996981078,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "sample - array sorting - small",
            "value": 0.0199,
            "range": "0.2383",
            "unit": "ms",
            "extra": "50242 ops/sec"
          },
          {
            "name": "sample - array sorting - large",
            "value": 3.1668,
            "range": "0.4878",
            "unit": "ms",
            "extra": "316 ops/sec"
          },
          {
            "name": "sample - string concatenation",
            "value": 0.0048,
            "range": "0.2735",
            "unit": "ms",
            "extra": "208013 ops/sec"
          },
          {
            "name": "sample - object creation",
            "value": 0.0666,
            "range": "0.47880000000000006",
            "unit": "ms",
            "extra": "15023 ops/sec"
          }
        ]
      }
    ]
  }
}