import { IEnvironment } from './ienvironment';

export const environment: IEnvironment = {
  production: false,
  version: '#{Build.BuildNumber}#',
  apiUrl: 'https://localhost:7212/'
};
