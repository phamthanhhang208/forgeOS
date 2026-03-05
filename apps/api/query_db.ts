import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: { agentOutputs: true }
  })
  
  if (projects.length === 0) {
    console.log("No projects found.")
    return
  }
  
  const p = projects[0]
  console.log(`Latest project ID: ${p.id}`)
  console.log(`Current Node: ${p.currentNode}`)
  console.log("Agent Outputs:")
  for (const o of p.agentOutputs) {
    console.log(`  - Node ${o.nodeId} (v${o.version}): ${o.status}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
