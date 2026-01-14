---
description: Validate model fairness across demographic groups
agent: explore
---

Analyze model fairness metrics and validate equitable performance.

Tasks:

1. Query AgentDB for demographic performance metrics
2. Calculate TPR (True Positive Rate) gaps across skin tone groups
3. Calculate FPR (False Positive Rate) gaps across groups
4. Compare against fairness thresholds (typically 0.1)

Focus on:

- TPR gaps between demographic groups
- FPR gaps between demographic groups
- Skin tone detection bias
- Lesion classification fairness

Provide:

- Fairness metrics report
- Any demographic bias detected
- Recommendations for improving fairness
- Validation that `fairness_validated` state is achievable

$ARGUMENTS
