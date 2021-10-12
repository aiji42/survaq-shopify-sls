module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@functions/(.+)': '<rootDir>/src/functions/$1',
    '^@libs/(.+)': '<rootDir>/src/libs/$1'
  }
}
