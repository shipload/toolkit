#!/usr/bin/env bun
import {$} from 'bun'
import {readdir} from 'node:fs/promises'
import {join} from 'node:path'

const ROOT = join(import.meta.dir, '..')

type Pkg = {name: string; dir: string; path: string}

async function getPackages(): Promise<Pkg[]> {
    const entries = await readdir(join(ROOT, 'packages'), {withFileTypes: true})
    const packages: Pkg[] = []
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const pkgJson = await Bun.file(join(ROOT, 'packages', entry.name, 'package.json')).json()
        packages.push({
            name: pkgJson.name,
            dir: entry.name,
            path: `packages/${entry.name}`,
        })
    }
    return packages
}

async function lastTagForPackage(pkg: Pkg): Promise<string | null> {
    for (const pattern of [`${pkg.name}@*`, `${pkg.dir}-v*`]) {
        const out = (await $`git tag --list ${pattern} --sort=-v:refname`.quiet().text()).trim()
        const tag = out.split('\n')[0]?.trim()
        if (tag) return tag
    }
    return null
}

async function commitsSince(tag: string | null, path: string): Promise<string[]> {
    const range = tag ? `${tag}..HEAD` : 'HEAD'
    const out = (await $`git log ${range} --format=%s -- ${path}`.quiet().text()).trim()
    return out ? out.split('\n') : []
}

const packages = await getPackages()
const allCommits = new Set<string>()

for (const pkg of packages) {
    const tag = await lastTagForPackage(pkg)
    const commits = await commitsSince(tag, pkg.path)
    for (const c of commits) allCommits.add(c)
}

const noise = /^(chore: version packages|release:|Add 'packages\/)/
const filtered = [...allCommits].filter((c) => !noise.test(c))

if (filtered.length === 0) {
    console.error('No commits found since last release.')
    process.exit(1)
}

console.log(filtered.map((c) => `- ${c}`).join('\n'))
