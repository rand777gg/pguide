<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
// ElMessage 由 unplugin-auto-import 自动引入，不要从 'element-plus' 根入口 import
// 图标不归 resolver 管，必须显式引入
import { Search } from '@element-plus/icons-vue'
import type { SubjectTreeNode } from '@pguide/api'
import SubjectCascade from '@/components/SubjectCascade.vue'
import InfoCard from '@/components/InfoCard.vue'
import RecruitCard from '@/components/RecruitCard.vue'
import { loadSubjectTree } from '@/services/subject'
import { loadHotProjects, loadRecruitDemands, IS_PLACEHOLDER_DATA } from '@/services/project'
import type { ProjectCard, RecruitCard as RecruitCardModel } from '@/services/project'

/**
 * 首页主体。
 *
 * 老工程 `views/frame/HomeBody.vue` 约 25KB，七个区块里只有学科树是真的调接口，
 * 其余（搜索框、左侧导航、收藏按钮、热门项目、需求市场、内嵌详情）全是硬编码，
 * 还有 `http://localhost:4000` 写死在源码里。
 *
 * 新实现的取舍：
 *   - 学科树：真实接口（/cms/subject/tree），三级联动用计算属性推导
 *   - 搜索框：改成**可用**的，在学科树里做关键词过滤（老的是一个无绑定的空壳）
 *   - 热门项目 / 需求市场：后端暂无接口，走 service 层的占位数据并显式标注
 *   - 删除：左侧占位导航、收藏圆钮、内嵌详情层（都是死 UI）
 */
const router = useRouter()

const subjectTree = ref<SubjectTreeNode[]>([])
const subjectFlat = ref<SubjectTreeNode[]>([])
const subjectLoading = ref(false)
const subjectError = ref<string | null>(null)

const hotProjects = ref<ProjectCard[]>([])
const recruitDemands = ref<RecruitCardModel[]>([])
const listLoading = ref(false)

const keyword = ref('')

/** 关键词过滤：命中学科名就保留（含父节点，保证结构不断链） */
const filteredTree = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return subjectTree.value

  const match = (node: SubjectTreeNode): SubjectTreeNode | null => {
    const children = node.children.map(match).filter((n): n is SubjectTreeNode => n !== null)
    const selfMatched = node.subjectName.toLowerCase().includes(kw)
    if (selfMatched || children.length) {
      return { ...node, children }
    }
    return null
  }

  return subjectTree.value.map(match).filter((n): n is SubjectTreeNode => n !== null)
})

const matchCount = computed(() =>
  keyword.value.trim() ? filteredTree.value.reduce((sum, node) => sum + countNodes(node), 0) : subjectFlat.value.length,
)

function countNodes(node: SubjectTreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
}

async function fetchSubjectTree(): Promise<void> {
  subjectLoading.value = true
  subjectError.value = null
  try {
    const result = await loadSubjectTree()
    subjectTree.value = result.tree
    subjectFlat.value = result.flat
  } catch (error) {
    subjectError.value = error instanceof Error ? error.message : '学科树加载失败'
  } finally {
    subjectLoading.value = false
  }
}

async function fetchLists(): Promise<void> {
  listLoading.value = true
  try {
    const [projects, recruits] = await Promise.all([loadHotProjects(), loadRecruitDemands()])
    hotProjects.value = projects
    recruitDemands.value = recruits
  } finally {
    listLoading.value = false
  }
}

function goToSubjectDetail(node: SubjectTreeNode): void {
  // 老工程这里写的是 window.open("http://localhost:4000/#/details?detailTags=" + name)
  void router.push({ name: 'detail', query: { detailTags: node.subjectName } })
}

function openProject(project: ProjectCard): void {
  ElMessage.info(`项目详情接口尚未实现：${project.name}`)
}

function resetKeyword(): void {
  keyword.value = ''
}

onMounted(() => {
  void fetchSubjectTree()
  void fetchLists()
})
</script>

<template>
  <div class="home-body">
    <!-- 搜索区 -->
    <section class="home-body__hero">
      <h1 class="home-body__slogan">找到一起打比赛的队友</h1>
      <p class="home-body__subtitle">按学科方向筛选项目，或直接发布你的招募需求</p>

      <div class="home-body__search">
        <el-input
          v-model="keyword"
          size="large"
          placeholder="搜索学科方向，例如：数学建模 / 创新创业"
          clearable
          @keyup.enter="() => {}"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="large" type="primary" @click="resetKeyword">重置</el-button>
      </div>
    </section>

    <!-- 学科分类 -->
    <section class="home-body__section">
      <header class="home-body__section-header">
        <h2 class="home-body__section-title">学科分类</h2>
        <span class="home-body__section-hint">
          <template v-if="keyword.trim()">匹配 {{ matchCount }} 个方向</template>
          <template v-else>共 {{ matchCount }} 个方向</template>
        </span>
      </header>

      <el-alert
        v-if="subjectError"
        class="home-body__alert"
        type="error"
        :title="`学科树加载失败：${subjectError}`"
        :closable="false"
        show-icon
      />
      <SubjectCascade
        v-else
        :tree="filteredTree"
        :loading="subjectLoading"
        @select="goToSubjectDetail"
      />
    </section>

    <!-- 热门项目 -->
    <section class="home-body__section">
      <header class="home-body__section-header">
        <h2 class="home-body__section-title">热门项目</h2>
        <el-tag v-if="IS_PLACEHOLDER_DATA" size="small" type="warning" effect="plain">
          示例数据 · 后端接口待实现
        </el-tag>
      </header>

      <div v-loading="listLoading" class="home-body__grid">
        <InfoCard
          v-for="project in hotProjects"
          :key="project.id"
          :project="project"
          @open="openProject"
        />
      </div>
    </section>

    <!-- 需求市场 -->
    <section class="home-body__section">
      <header class="home-body__section-header">
        <h2 class="home-body__section-title">需求市场</h2>
        <el-tag v-if="IS_PLACEHOLDER_DATA" size="small" type="warning" effect="plain">
          示例数据 · 后端接口待实现
        </el-tag>
      </header>

      <div v-loading="listLoading" class="home-body__grid">
        <RecruitCard v-for="recruit in recruitDemands" :key="recruit.id" :recruit="recruit" />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-body {
  max-width: var(--pg-content-max-width);
  margin: 0 auto;
  padding: var(--pg-spacing-xl) var(--pg-spacing-lg) 80px;

  &__hero {
    text-align: center;
    padding: var(--pg-spacing-xl) 0 var(--pg-spacing-lg);
  }

  &__slogan {
    font-size: 32px;
    font-weight: 700;
    color: var(--pg-text-primary);
    margin-bottom: var(--pg-spacing-sm);
  }

  &__subtitle {
    font-size: 15px;
    color: var(--pg-text-secondary);
    margin-bottom: var(--pg-spacing-lg);
  }

  &__search {
    display: flex;
    gap: var(--pg-spacing-sm);
    max-width: 620px;
    margin: 0 auto;
  }

  &__section {
    margin-top: var(--pg-spacing-xl);
  }

  &__section-header {
    display: flex;
    align-items: center;
    gap: var(--pg-spacing-md);
    margin-bottom: var(--pg-spacing-md);
  }

  &__section-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--pg-text-primary);
  }

  &__section-hint {
    font-size: 13px;
    color: var(--pg-text-secondary);
  }

  &__alert {
    margin-bottom: var(--pg-spacing-md);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--pg-spacing-md);
    min-height: 80px;
  }
}
</style>
