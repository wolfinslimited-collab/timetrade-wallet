// Fix recharts JSX component type errors with newer @types/react
import * as React from 'react';

declare module 'recharts' {
  export class XAxis extends React.Component<any, any> {}
  export class YAxis extends React.Component<any, any> {}
  export class Tooltip extends React.Component<any, any> {}
  export class Area extends React.Component<any, any> {}
  export class Bar extends React.Component<any, any> {}
  export class Line extends React.Component<any, any> {}
  export class CartesianGrid extends React.Component<any, any> {}
  export class Legend extends React.Component<any, any> {}
  export class Pie extends React.Component<any, any> {}
  export class Cell extends React.Component<any, any> {}
  export class Scatter extends React.Component<any, any> {}
  export class RadialBar extends React.Component<any, any> {}
}