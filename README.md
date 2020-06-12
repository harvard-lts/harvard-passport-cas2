# @harvard-library/passport-cas2-strategy

# Package Implementation
Read the documentation for using this package in a NodeJS application.
[@harvard-library/passport-cas2-strategy](https://github.com/ktamaral/harvard-passport-cas2/blob/master/passport-cas2-strategy/README.md)

# Package Updates
To make updates to this package, update the code as required, and then publish the changes to the npm repository. Read the official npm documentation for the full instructions on [publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages#publishing-scoped-public-packages).

Optionally, this project has a basic docker image with NodeJs installed to run the npm commands.

### Update package json version
Update the package.json version. The version number must not exist in the npm repository already.

### Run npm container

```
docker-compose up
```

Open a shell inside the container.

```
docker exec -it harvard-passport-cas2 bash
```

### Publish updated package
```
npm login
npm publish --access public
```

