/**
 * Quality Gate Goals
 *
 * Goal definitions for the quality gate GOAP system
 */

/**
 * Primary goal for the CI check system
 */
export const CI_CHECK_GOAL = {
  name: 'fix_all_ci_checks',
  description: 'Fix all CI check failures to ensure pipeline passes',
  targetState: {
    eslint_passing: true,
    formatting_passing: true,
    unit_tests_passing: true,
    e2e_tests_passing: true,
    sonarcloud_passing: true,
    code_complexity_passing: true,
    all_ci_checks_passing: true,
  },
  priority: 1,
} as const;

/**
 * Intermediate goals for debugging and partial progress
 */
export const INTERMEDIATE_CI_GOALS = [
  {
    name: 'fix_eslint_issues',
    description: 'Fix ESLint linting errors and warnings',
    targetState: { eslint_passing: true },
    priority: 6,
  },
  {
    name: 'fix_formatting_issues',
    description: 'Apply consistent code formatting',
    targetState: { formatting_passing: true },
    priority: 5,
  },
  {
    name: 'fix_unit_test_failures',
    description: 'Fix failing unit tests and improve coverage',
    targetState: { unit_tests_passing: true },
    priority: 4,
  },
  {
    name: 'fix_e2e_tests',
    description: 'Fix failing e2e test scenarios',
    targetState: { e2e_tests_passing: true },
    priority: 3,
  },
  {
    name: 'fix_sonarcloud_issues',
    description: 'Resolve SonarCloud quality gate issues',
    targetState: { sonarcloud_passing: true },
    priority: 2,
  },
  {
    name: 'reduce_code_complexity',
    description: 'Refactor high complexity code',
    targetState: { code_complexity_passing: true },
    priority: 1,
  },
] as const;
