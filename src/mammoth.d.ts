// Minimal ambient declaration for mammoth's prebuilt browser bundle.
declare module 'mammoth/mammoth.browser' {
  export interface ExtractResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractResult>
  const _default: { extractRawText: typeof extractRawText }
  export default _default
}
