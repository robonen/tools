type Split<S extends string, D extends string> = S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
    ? [T, ...Split<U, D>]
    : [S];

type UnwrapNumbers<T extends string | string[] | number | number[]> = T extends number | number[]
  ? T
  : T extends string
    ? T extends `${infer N extends number}`
      ? N
      : never
    : T extends [infer H extends string, ...infer T extends string[]]
      ? UnwrapNumbers<H> extends never
        ? never
        : [UnwrapNumbers<H>, ...UnwrapNumbers<T>]
      : [];

type IPv4Octets = [number, number, number, number];

type IPv4<CIDR extends string> = Split<CIDR, '/'> extends [
  infer IP extends string,
  infer SUBNET extends string,
]
  ? UnwrapNumbers<Split<IP, '.'>> extends infer OCTETS
    ? OCTETS extends never
      ? never
      : OCTETS extends IPv4Octets
        ? UnwrapNumbers<SUBNET> extends never
          ? never
          : CIDR
        : never
    : never
  : never;

type IPv6<CIDR extends string> = Split<CIDR, '/'> extends [
  infer IP extends string,
  infer SUBNET extends string,
]
  ? Split<IP, ':'> extends string[]
    ? UnwrapNumbers<SUBNET> extends never
      ? never
      : CIDR
    : never
  : never;

type Test_1 = IPv4<'0.0.0.0/0'>;
type Test_2 = IPv4<'255.255.255.255/32'>;
type Test_3 = IPv4<'127.0.0.0.1/32'>;
type Test_4 = IPv4<'a'>;
type Test_5 = IPv4<'1.1.1.a/32'>;
type Test_6 = IPv4<'1.1.1.1'>;
type Test_7 = IPv4<'1.1.1.1/'>;
type Test_8 = IPv4<'1.1.1.1/a'>;

type Test_9 = IPv6<'::/0'>;
type Test_10 = IPv6<'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff/128'>;
type Test_11 = IPv6<'::1/128'>;
type Test_12 = IPv6<'a'>;
type Test_13 = IPv6<'1:1:1:1:1:1:1:1/128'>;
type Test_14 = IPv6<'1:1:1:1:1:1:1:1'>;
type Test_15 = IPv6<'1:1:1:1:1:1:1:1/'>;
type Test_16 = IPv6<'1:1:1:1:1:1:1:1/a'>;
