import * as pkg from './index'
const Shipload = pkg.default
for (const key of Object.keys(pkg)) {
    if (key === 'default') continue
    Shipload[key] = pkg[key]
}
export default Shipload
