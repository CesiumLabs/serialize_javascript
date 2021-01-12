# Serialize JavaScript
Deno version of **[serialize-javascript](https://npmjs.com/package/serialize-javascript)**.

# Example

```js
import { serialize, deserialize } from "https://deno.land/x/serialize_javascript/mod.ts";

const result = serialize({
    str: 'string',
    num: 0,
    obj: { foo: 'foo' },
    arr: [1, 2, 3],
    bool: true,
    nil: null,
    undef: undefined,
    inf: Infinity,
    date: new Date(),
    map: new Map([['hello', 'world']]),
    set: new Set([123, 456]),
    fn: function echo(arg: string) { return arg; },
    re: /([^\s]+)/g,
    big: BigInt(10)
})

console.log(result);

const parsed = deserialize(result);
console.log(parsed)

```

# Preview
## First

```js
{"str":"string","num":0,"obj":{"foo":"foo"},"arr":[1,2,3],"bool":true,"nil":null,"undef":undefined,"inf":Infinity,"date":new Date("2021-01-12T18:21:27.987Z"),"map":new Map([["hello","world"]]),"set":new Set([123,456]),"fn":function echo(arg) { return arg; },"re":new RegExp("([^\\s]+)", "g"),"big":BigInt("10")}
```

## Second

```js
{
  str: "string",
  num: 0,
  obj: { foo: "foo" },
  arr: [ 1, 2, 3 ],
  bool: true,
  nil: null,
  undef: undefined,
  inf: Infinity,
  date: 2021-01-12T18:21:27.987Z,
  map: Map { "hello" => "world" },
  set: Set { 123, 456 },
  fn: [Function: echo],
  re: /([^\s]+)/g,
  big: 10n
}
```