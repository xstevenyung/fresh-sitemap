export {
  basename,
  extname,
  join,
  resolve,
} from "https://deno.land/std@0.197.0/path/mod.ts";
export {
  assert,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.197.0/testing/asserts.ts";
export { FakeTime } from "https://deno.land/std@0.197.0/testing/time.ts";
export { ensureFile } from "https://deno.land/std@0.197.0/fs/mod.ts";

import {
  globToRegExp,
  isAbsolute,
  joinGlobs,
  normalize,
  relative,
} from "https://deno.land/std@0.71.0/path/mod.ts";

export interface GlobData {
  match: (string | RegExp)[] | string | RegExp;
  ignore: (string | RegExp)[] | string | RegExp;
}

export interface ConfigOptions {
  /**
   * What `evaluateGlob` should do with absolute files
   * - `error` - errors out
   * - `make-glob-absolute` - prepends `Deno.cwd()` onto the glob
   * - `remove-slash-one` - removes any leading `/`'s from the file path
   * - `make-file-relative` - tries to make the file path relative to `Deno.cwd()`
   *
   * @default 'make-file-relative'
   */
  absolutePathsAction?:
    | "error"
    | "make-glob-absolute"
    | "remove-slash-one"
    | "make-file-relative";
}

export interface EvaluateGlobsParams extends ConfigOptions {
  /** The file to be evaluated */
  file: string;

  /** The globs the file is to be tested by */
  glob: GlobData;
}

/**
 * Returns true if the file was included, but not excluded.
 * Files should be passed in as relative paths.
 * The first `./` part of the file or glob will be removed before testing
 *
 * > All Globs should be relative, preferably without the first `./` part
 */
export function checkFile(
  { file, absolutePathsAction, glob: { match: include, ignore: exclude } }:
    EvaluateGlobsParams,
): boolean {
  const globIsFile = (file: string, glob: string | RegExp): boolean => {
    file = normalize(file);

    const evaluate = (file: string, glob: string | RegExp): boolean => {
      if (typeof glob === "string") return globToRegExp(glob).test(file);
      else return glob.test(file);
    };

    if (isAbsolute(file)) {
      if (absolutePathsAction === "error") {
        throw new Error(
          `Encountered an absolute path while 'absolutePathsAction' was set to 'error'`,
        );
      } else if (absolutePathsAction === "remove-slash-one") {
        return globIsFile(file.slice(1), glob);
      } else if (
        absolutePathsAction === "make-glob-absolute" && typeof glob === "string"
      ) {
        return evaluate(file, joinGlobs([Deno.cwd(), glob]));
      } else if (
        !absolutePathsAction || absolutePathsAction === "make-file-relative"
      ) {
        return globIsFile(relative(Deno.cwd(), file), glob);
      } else {
        throw new Error(
          `'${absolutePathsAction}' is an invalid value for 'absolutePathsAction'.  See the glob-filter docs for details`,
        );
      }
    } else if (typeof glob === "string" && glob.startsWith("./")) {
      return globIsFile(file, glob.slice(2));
    } else if (file.startsWith("./")) return globIsFile(file.slice(2), glob);

    return evaluate(file, glob);
  };

  const makeArray = <T>(data: T[] | T) => (Array.isArray(data) ? data : [data]);

  let didInclude = false;
  for (const glob of makeArray(include)) {
    if (globIsFile(file, glob)) {
      didInclude = true;
      break;
    }
  }

  if (!didInclude) return false;

  let didExclude = false;
  for (const glob of makeArray(exclude)) {
    if (globIsFile(file, glob)) {
      didExclude = true;
      break;
    }
  }

  return !didExclude;
}

/**
 * Filters out the files that were either not included in `globs.include`, or excluded from `globs.exclude`.
 * Files should be passed in as relative paths.
 * The first `./` part of the file or glob will be removed before testing
 */
export function filterFiles(
  files: string[],
  globs: GlobData,
  options: ConfigOptions = {},
) {
  return files.filter((file) => checkFile({ file, glob: globs, ...options }));
}
