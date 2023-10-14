```plaintext
#gk:exec type=d2
#gk:execarg sketch true
#gk:execarg theme 103
direction: right
clouds: {  
  aws: {
    load_balancer -> api
    api -> db
  }
  gcloud: {
    auth -> db
  }

  gcloud -> aws
}
```

```python
#gk:exec type=bash python
print('hello world45')
# raise RuntimeError()
```

```c
// #gk:id snippet1
int b;
```

@p Lorem Ipsum _is_ simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.

```c
// #gk:id myid
// #gk:title This is title
// #gk:desc This is figure description.

// #gk:include target=snippet1 desc=a include block
// #gk:zip
// #gk:include target=snippet1
// line
// #gk:endzip
// #gk:zip desc=desc1
int c;
// #gk:zip desc=desc2
int c2;
// #gk:endzip
// #gk:endzip

// #gk:hl id=name desc=description longggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg
char d;
// #gk:endhl

// #gk:zip
#include <stdio.h>
// #gk:endzip
```

some text

```c
// #gk:id left
// #gk:title Left Code
int main() {
// #gk:hl
fuck;
// #gk:endhl
}
```

some other text

```c
// #gk:title Right Code
// #gk:id right
// #gk:with left
// #gk:with SELF
// #gk:style row
int main() {
    printf("hello");
    // #gk:zip desc=two returns
    return 0;
    return 1;
}
    // #gk:endzip
```

```
#gk:with left
#gk:with right
#gk:style tab
```

```python
#gk:id diff-old
#gk:invisible
a = 1
b = 2
c = 3
d = 4
e = 5
f = 6
for i in range(1000):
    print(i**2)
```

```python
#gk:id diff-new
#gk:diff diff-old SELF
a = 1
b = 2
c = 3
d = 4
e = 5
f = 6
for i in range(1000):
    print(i<<2)
# a looooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooong line
```
