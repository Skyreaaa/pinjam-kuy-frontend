
// Global image/module declarations
declare module '*.png' { const value: string; export default value; }
declare module '*.jpg' { const value: string; export default value; }
declare module '*.jpeg' { const value: string; export default value; }
declare module '*.svg' { const value: string; export default value; }

// Fix for TS2503: Cannot find namespace 'JSX'.
import type * as React from 'react';
declare global {
	namespace JSX {
		interface Element extends React.ReactElement<any, any> {}
		interface ElementClass extends React.Component<any> {
			render(): React.ReactNode;
		}
		interface IntrinsicElements {
			[elemName: string]: any;
		}
	}
}
